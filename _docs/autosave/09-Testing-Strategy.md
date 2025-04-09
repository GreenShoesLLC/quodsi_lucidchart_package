# Testing Strategy for Autosave Implementation

## Current Testing Approach

The current manual save implementation relies on these testing methods:

1. **Manual Testing**: Direct user interaction to verify save functionality
2. **Console Logging**: Debug logging to trace save operations
3. **Basic Unit Tests**: Tests for component rendering and basic functionality
4. **No Specific Error Testing**: Limited focus on edge cases and error states

This approach has limitations for testing more complex autosave functionality:

- Difficult to verify debounce behavior
- Hard to reproduce race conditions
- Limited coverage of error scenarios
- No simulation of network conditions
- Challenging to test asynchronous operations

## Comprehensive Testing Strategy for Autosave

A robust testing strategy for autosave should cover multiple testing types and scenarios:

### 1. Unit Testing

Focus on testing individual components and functions in isolation:

```typescript
// Example Jest test for BaseEditor debouncing
describe('BaseEditor autosave behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  it('should debounce save operations', () => {
    const onSaveMock = jest.fn();
    const { result } = renderHook(() => 
      useBaseEditor({ onSave: onSaveMock, debounceTime: 800 })
    );
    
    // Trigger a change
    act(() => {
      result.current.handleChange({ 
        target: { name: 'probability', value: '0.5' } 
      } as any);
    });
    
    // Should not call save immediately
    expect(onSaveMock).not.toHaveBeenCalled();
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Still should not have called save
    expect(onSaveMock).not.toHaveBeenCalled();
    
    // Make another change
    act(() => {
      result.current.handleChange({ 
        target: { name: 'probability', value: '0.75' } 
      } as any);
    });
    
    // Fast-forward past debounce time
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Now it should have saved with the latest value
    expect(onSaveMock).toHaveBeenCalledTimes(1);
    expect(onSaveMock).toHaveBeenCalledWith(
      expect.objectContaining({ probability: '0.75' })
    );
  });
  
  it('should validate before saving', () => {
    const onSaveMock = jest.fn();
    const validators = [
      {
        field: 'probability',
        validate: (value: any) => 
          Number(value) > 1 ? 'Must be 1 or less' : null
      }
    ];
    
    const { result } = renderHook(() => 
      useBaseEditor({ 
        onSave: onSaveMock, 
        validators,
        debounceTime: 800 
      })
    );
    
    // Trigger an invalid change
    act(() => {
      result.current.handleChange({ 
        target: { name: 'probability', value: '2' } 
      } as any);
    });
    
    // Fast-forward past debounce time
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Should not save due to validation error
    expect(onSaveMock).not.toHaveBeenCalled();
    
    // Should have validation error
    expect(result.current.validationErrors).toContainEqual(
      expect.objectContaining({
        fieldName: 'probability',
        message: 'Must be 1 or less'
      })
    );
    
    // Fix the error
    act(() => {
      result.current.handleChange({ 
        target: { name: 'probability', value: '0.8' } 
      } as any);
    });
    
    // Fast-forward past debounce time
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Now it should save
    expect(onSaveMock).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Integration Testing

Test the interaction between components and the messaging system:

```typescript
// Example integration test for ConnectorEditor with autosave
describe('ConnectorEditor integration tests', () => {
  it('should register probability field for autosave', async () => {
    // Mock BaseEditor
    jest.mock('../BaseEditor', () => {
      return ({ children, data, onSave }) => {
        const setAutoSaveFieldsMock = jest.fn();
        // Call children render prop to get the component content
        const content = children(data, jest.fn(), setAutoSaveFieldsMock);
        
        // Run any useEffect hooks that would be in child component
        React.useEffect(() => {
          const effects = React.useDebugValue?.() || [];
          effects.forEach(effect => effect.callback());
        }, []);
        
        return (
          <div data-testid="base-editor">
            {content}
            <div data-testid="autosave-fields">
              {JSON.stringify(setAutoSaveFieldsMock.mock.calls)}
            </div>
          </div>
        );
      };
    });
    
    // Render the component
    const onSaveMock = jest.fn();
    const { getByTestId } = render(
      <ConnectorEditor 
        connector={{ id: '123', probability: 0.5, connectType: 'Probability' }}
        onSave={onSaveMock}
        onCancel={jest.fn()}
      />
    );
    
    // Check that probability was registered
    const autosaveFields = JSON.parse(
      getByTestId('autosave-fields').textContent || '[]'
    );
    
    // Should have called setAutoSaveFields with the right field
    expect(autosaveFields).toContainEqual(['probability']);
  });
  
  it('should trigger save after editing probability', async () => {
    // Real component test with mock messaging
    const mockMessaging = {
      sendMessage: jest.fn()
    };
    
    jest.mock('@quodsi/shared', () => ({
      ...jest.requireActual('@quodsi/shared'),
      ExtensionMessaging: {
        getInstance: () => mockMessaging
      }
    }));
    
    // Render full component tree
    const { getByLabelText } = render(<QuodsiApp />);
    
    // Navigate to connector and edit probability
    // ...test navigation code...
    
    // Find and edit the probability field
    const probabilityInput = getByLabelText('Probability');
    
    // Change the value
    fireEvent.change(probabilityInput, { target: { value: '0.75' } });
    
    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Check that message was sent
    expect(mockMessaging.sendMessage).toHaveBeenCalledWith(
      'UPDATE_ELEMENT_DATA',
      expect.objectContaining({
        data: expect.objectContaining({
          probability: '0.75'
        })
      })
    );
  });
});
```

### 3. End-to-End Testing

Test the complete flow from user action to extension response:

```typescript
// Example Cypress test for autosave
describe('Autosave end-to-end tests', () => {
  beforeEach(() => {
    cy.visit('/');
    // Log in and navigate to a test model
    cy.get('#username').type('testuser');
    cy.get('#password').type('password123');
    cy.get('#login-button').click();
    cy.get('[data-testid="test-model"]').click();
  });
  
  it('should autosave probability changes', () => {
    // Open connector properties
    cy.get('[data-testid="connector-123"]').click();
    
    // Find probability field
    cy.get('#probability').should('be.visible');
    
    // Change probability
    cy.get('#probability').clear().type('0.75');
    
    // Check for saving indicator
    cy.get('.quodsi-auto-save-indicator').should('be.visible');
    
    // Wait for indicator to change to success
    cy.get('.quodsi-auto-save-success', { timeout: 5000 }).should('be.visible');
    
    // Reload the page
    cy.reload();
    
    // Re-open connector
    cy.get('[data-testid="connector-123"]').click();
    
    // Verify value persisted
    cy.get('#probability').should('have.value', '0.75');
  });
  
  it('should show validation errors and not save invalid values', () => {
    // Open connector properties
    cy.get('[data-testid="connector-123"]').click();
    
    // Enter invalid probability
    cy.get('#probability').clear().type('2');
    
    // Should show validation error
    cy.get('.quodsi-error-message').should('be.visible');
    cy.get('.quodsi-error-message').should('contain.text', 'between 0 and 1');
    
    // Should not show saving indicator
    cy.get('.quodsi-auto-save-indicator').should('not.exist');
    
    // Fix the value
    cy.get('#probability').clear().type('0.5');
    
    // Error should disappear
    cy.get('.quodsi-error-message').should('not.exist');
    
    // Should save automatically
    cy.get('.quodsi-auto-save-indicator').should('be.visible');
    cy.get('.quodsi-auto-save-success', { timeout: 5000 }).should('be.visible');
  });
});
```

### 4. Performance Testing

Test the performance implications of autosave:

```typescript
// Example Jest performance test
describe('Autosave performance tests', () => {
  it('should not exceed render budget during rapid changes', async () => {
    // Set up performance monitoring
    const renderTimes: number[] = [];
    const originalRender = React.Component.prototype.render;
    
    React.Component.prototype.render = function() {
      const start = performance.now();
      const result = originalRender.apply(this, arguments);
      const end = performance.now();
      renderTimes.push(end - start);
      return result;
    };
    
    // Render test component
    const { getByLabelText } = render(<TestEditorComponent />);
    
    // Simulate rapid changes
    const input = getByLabelText('Probability');
    for (let i = 1; i <= 10; i++) {
      const value = (i / 10).toString();
      fireEvent.change(input, { target: { value } });
      // Wait a small amount between changes
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
    }
    
    // Wait for final debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Restore original render
    React.Component.prototype.render = originalRender;
    
    // Calculate performance metrics
    const maxRenderTime = Math.max(...renderTimes);
    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    
    // Assert performance constraints
    expect(maxRenderTime).toBeLessThan(16); // 60fps = 16ms per frame
    expect(avgRenderTime).toBeLessThan(8);  // Aim for half the budget on average
    
    // Check for render count (should batch updates)
    expect(renderTimes.length).toBeLessThan(15); // Should have merged some renders
  });
  
  it('should handle multiple autosave fields efficiently', () => {
    // Similar performance testing with multiple fields
  });
});
```

### 5. Error Testing

Test how the system handles various error conditions:

```typescript
// Example error testing
describe('Autosave error handling tests', () => {
  it('should handle network failure gracefully', async () => {
    // Mock messaging to simulate network failure
    const mockMessaging = {
      sendMessage: jest.fn().mockImplementation(() => {
        throw new Error('Network error');
      })
    };
    
    jest.mock('@quodsi/shared', () => ({
      ...jest.requireActual('@quodsi/shared'),
      ExtensionMessaging: {
        getInstance: () => mockMessaging
      }
    }));
    
    // Render component
    const { getByLabelText, getByText } = render(<TestEditorComponent />);
    
    // Change value
    const input = getByLabelText('Probability');
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Should show error message
    expect(getByText(/failed to save/i)).toBeInTheDocument();
    expect(getByText(/retry/i)).toBeInTheDocument();
    
    // Mock successful retry
    mockMessaging.sendMessage.mockImplementation(() => Promise.resolve());
    
    // Click retry
    fireEvent.click(getByText(/retry/i));
    
    // Should show success
    await waitFor(() => {
      expect(getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });
  
  it('should attempt to save to localStorage when server save fails', async () => {
    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => {
          store[key] = value.toString();
        }),
        clear: jest.fn(() => {
          store = {};
        })
      };
    })();
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    
    // Mock messaging failure
    const mockMessaging = {
      sendMessage: jest.fn().mockImplementation(() => {
        throw new Error('Server error');
      })
    };
    
    jest.mock('@quodsi/shared', () => ({
      ...jest.requireActual('@quodsi/shared'),
      ExtensionMessaging: {
        getInstance: () => mockMessaging
      }
    }));
    
    // Render component
    const { getByLabelText } = render(<TestEditorComponent />);
    
    // Change value
    const input = getByLabelText('Probability');
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Should have attempted localStorage backup
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      expect.stringMatching(/quodsi_autosave_backup/),
      expect.stringContaining('0.8')
    );
  });
});
```

### 6. User Experience Testing

Test the user's experience of autosave:

```typescript
// Example UX testing scenarios
describe('Autosave UX tests', () => {
  it('should indicate save status clearly to the user', async () => {
    // Render component
    const { getByLabelText, getByTestId } = render(<TestEditorComponent />);
    
    // Initial state - no indicators
    expect(document.querySelector('.quodsi-auto-save-indicator')).toBeNull();
    
    // Change value
    const input = getByLabelText('Probability');
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Should immediately show "saving" indicator
    await waitFor(() => {
      expect(getByTestId('save-indicator')).toHaveTextContent(/saving/i);
    });
    
    // After debounce completes, should show success briefly
    await waitFor(() => {
      expect(getByTestId('save-indicator')).toHaveTextContent(/saved/i);
    }, { timeout: 2000 });
    
    // Success indicator should disappear after a delay
    await waitFor(() => {
      expect(document.querySelector('.quodsi-auto-save-indicator')).toBeNull();
    }, { timeout: 4000 });
  });
  
  it('should provide accessibility features for save status', () => {
    // Test for aria attributes
    const { getByLabelText } = render(<TestEditorComponent />);
    
    // Change value
    const input = getByLabelText('Probability');
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Find status message element
    const statusElement = document.querySelector('[aria-live="polite"]');
    expect(statusElement).not.toBeNull();
    
    // Should communicate status to screen readers
    expect(statusElement).toHaveAttribute('role', 'status');
  });
  
  it('should not interrupt user typing with save operations', async () => {
    // Test for input focus retention
    const { getByLabelText } = render(<TestEditorComponent />);
    
    // Get input and focus it
    const input = getByLabelText('Probability');
    input.focus();
    
    // Change value
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Input should retain focus during save
    expect(document.activeElement).toBe(input);
    
    // Wait for debounce and save
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Input should still have focus after save
    expect(document.activeElement).toBe(input);
  });
});
```

### 7. Accessibility Testing

Ensure the autosave functionality is accessible:

```typescript
// Example accessibility tests
describe('Autosave accessibility tests', () => {
  it('should be screen reader friendly', async () => {
    // Use axe-core for automated accessibility testing
    const { container, getByLabelText } = render(<TestEditorComponent />);
    
    // Initial accessibility check
    let results = await axe(container);
    expect(results).toHaveNoViolations();
    
    // Change value to trigger autosave
    const input = getByLabelText('Probability');
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Wait for save indicator to appear
    await waitFor(() => {
      expect(document.querySelector('.quodsi-auto-save-indicator')).not.toBeNull();
    });
    
    // Check accessibility with save indicator visible
    results = await axe(container);
    expect(results).toHaveNoViolations();
    
    // Wait for save to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Final accessibility check
    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('should be keyboard navigable', async () => {
    const { getByLabelText, getByText } = render(<TestEditorComponent />);
    
    // Tab to input
    userEvent.tab();
    expect(document.activeElement).toHaveAttribute('name', 'probability');
    
    // Change value
    userEvent.type(document.activeElement as HTMLElement, '0.8');
    
    // Should trigger validation error for demo
    await waitFor(() => {
      expect(getByText(/validation error/i)).toBeInTheDocument();
    });
    
    // Should be able to tab to retry button
    userEvent.tab();
    expect(document.activeElement).toHaveTextContent(/retry/i);
    
    // Should be able to activate button with keyboard
    userEvent.keyboard('{enter}');
    
    // Should show success after retry
    await waitFor(() => {
      expect(getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });
  
  it('should respect user motion preferences', () => {
    // Mock prefers-reduced-motion
    const mockMediaQuery = {
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    jest.spyOn(window, 'matchMedia').mockImplementation(query => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return mockMediaQuery as any;
      }
      return {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any;
    });
    
    // Render component
    const { getByLabelText, getByTestId } = render(<TestEditorComponent />);
    
    // Change value
    const input = getByLabelText('Probability');
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Get save indicator
    const indicator = getByTestId('save-indicator');
    
    // Should not have animation class for reduced motion
    expect(indicator).not.toHaveClass('quodsi-animated');
    expect(indicator).toHaveClass('quodsi-static');
    
    // Reset mock
    (window.matchMedia as jest.Mock).mockRestore();
  });
});
```

### 8. Configuration Testing

Test that configuration options work as expected:

```typescript
// Example configuration tests
describe('Autosave configuration tests', () => {
  it('should respect global enabled setting', () => {
    // Render with autosave disabled globally
    const { getByLabelText, queryByTestId } = render(
      <AutosaveConfigProvider config={{ enabled: false }}>
        <TestEditorComponent />
      </AutosaveConfigProvider>
    );
    
    // Change value
    const input = getByLabelText('Probability');
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Should not show saving indicator (since autosave is disabled)
    expect(queryByTestId('save-indicator')).toBeNull();
    
    // Manual save button should be visible instead
    expect(queryByTestId('save-button')).not.toBeNull();
  });
  
  it('should apply custom debounce time', async () => {
    // Mock timing functions
    jest.useFakeTimers();
    
    // Render with custom debounce time
    const onSaveMock = jest.fn();
    const { getByLabelText } = render(
      <AutosaveConfigProvider config={{ defaultDebounceTime: 1500 }}>
        <ConnectorEditor 
          connector={{ id: '123', probability: 0.5 }}
          onSave={onSaveMock}
          onCancel={jest.fn()}
        />
      </AutosaveConfigProvider>
    );
    
    // Change value
    const input = getByLabelText('Probability');
    fireEvent.change(input, { target: { value: '0.8' } });
    
    // Fast-forward less than debounce time
    jest.advanceTimersByTime(1000);
    
    // Should not have saved yet
    expect(onSaveMock).not.toHaveBeenCalled();
    
    // Fast-forward past custom debounce time
    jest.advanceTimersByTime(600);
    
    // Now it should save
    expect(onSaveMock).toHaveBeenCalledTimes(1);
    
    // Restore timers
    jest.useRealTimers();
  });
  
  it('should allow field-specific configuration', async () => {
    // Render with field configs
    const { getByLabelText, getByTestId } = render(
      <TestEditorComponent 
        fieldConfigs={{
          'probability': { enabled: true, debounceTime: 300 },
          'connectType': { enabled: false }
        }}
      />
    );
    
    // Change probability - should autosave
    const probInput = getByLabelText('Probability');
    fireEvent.change(probInput, { target: { value: '0.8' } });
    
    // Should show saving indicator quickly
    await waitFor(() => {
      expect(getByTestId('save-indicator')).toBeInTheDocument();
    }, { timeout: 400 });
    
    // Change connect type - should not autosave
    const typeInput = getByLabelText('Connect Type');
    fireEvent.change(typeInput, { target: { value: 'Direct' } });
    
    // Should not show additional saving indicator
    expect(getByTestId('save-count').textContent).toBe('1');
  });
});
```

## Testing Tools and Environment

The following tools will be used for testing:

1. **Jest**: For unit and integration tests
2. **React Testing Library**: For component testing
3. **Cypress**: For end-to-end tests
4. **Axe-core**: For accessibility testing
5. **Chrome DevTools Performance API**: For performance metrics

## Test Coverage Requirements

The autosave implementation should maintain high test coverage across different aspects:

| Test Category | Coverage Target | Critical Areas |
|---------------|----------------|----------------|
| Unit Tests | 90%+ | Debounce logic, validation, state management |
| Integration Tests | 80%+ | Component interactions, messaging |
| End-to-End Tests | Key flows | User journeys for critical paths |
| Performance Tests | Key metrics | Render times, memory usage, network calls |
| Accessibility Tests | WCAG 2.1 AA | Status indicators, keyboard navigation |

## Test Environment Setup

To support effective testing, set up these testing utilities:

```typescript
// test-utils.ts - Common testing utilities

// Mock ExtensionMessaging
export const createMockMessaging = () => {
  const mockMessaging = {
    sendMessage: jest.fn(),
    onMessage: jest.fn(),
    handleIncomingMessage: jest.fn()
  };
  
  jest.mock('@quodsi/shared', () => ({
    ...jest.requireActual('@quodsi/shared'),
    ExtensionMessaging: {
      getInstance: () => mockMessaging
    }
  }));
  
  return mockMessaging;
};

// Helper to simulate timing
export const simulateDebounceTime = async (time: number = 1000) => {
  return act(async () => {
    await new Promise(resolve => setTimeout(resolve, time));
  });
};

// Helper to simulate autosave field changes
export const triggerAutosaveField = async (
  fieldLabel: string, 
  value: string,
  debounceTime: number = 1000
) => {
  const input = screen.getByLabelText(fieldLabel);
  fireEvent.change(input, { target: { value } });
  await simulateDebounceTime(debounceTime);
};

// Create test wrapper with config
export const AutosaveTestProvider: React.FC<{
  children: React.ReactNode;
  config?: Partial<GlobalAutosaveConfig>;
}> = ({ children, config = {} }) => {
  return (
    <AutosaveConfigProvider 
      config={{ 
        ...defaultGlobalConfig,
        ...config
      }}
    >
      {children}
    </AutosaveConfigProvider>
  );
};
```

## Test Scenarios Matrix

Ensure tests cover all combinations of these scenarios:

| Input Variable | Test Values |
|----------------|-------------|
| Field Value | Valid, Invalid, Edge Cases, Empty |
| Save Timing | Fast Changes, Slow Changes, Cancelled Changes |
| Network Conditions | Normal, Slow, Disconnected |
| Error Scenarios | Validation Error, Server Error, Network Error |
| Configuration | Enabled, Disabled, Custom Debounce |
| UI State | Initial, Editing, Saving, Success, Error |
| Device Context | Desktop, Mobile, Low Bandwidth |

## Regression Testing

Create specific tests for common regression cases:

1. **Debounce Regressions**: Ensure debounce changes don't break functionality
2. **Validation Integration**: Test that new validation rules work with autosave
3. **Component Compatibility**: Verify autosave works across all editor components
4. **Extension Communication**: Test that messaging changes don't break autosave
5. **Edge Cases**: Maintain tests for known edge cases

## Continuous Integration

Integrate testing into the CI pipeline:

1. **Pre-commit Hooks**: Run unit tests before commits
2. **CI Pipeline Stages**:
   - Unit and integration tests on every commit
   - End-to-end tests on merge requests
   - Performance tests on scheduled basis
3. **Test Reports**: Generate and archive test reports

## Manual Testing Guidelines

In addition to automated tests, conduct these manual tests:

1. **Cross-browser Testing**: Test in Chrome, Firefox, Safari, Edge
2. **Real Device Testing**: Test on actual mobile devices
3. **Network Throttling**: Test with throttled network connections
4. **User Testing Sessions**: Observe real users interacting with autosave
5. **Accessibility Manual Checks**: Review with screen readers and keyboard navigation

## Conclusion

This comprehensive testing strategy ensures the autosave functionality is robust, performant, and user-friendly. By covering multiple testing types and scenarios, we can identify and fix issues early in the development process.

The strategy addresses the unique challenges of testing asynchronous autosave behavior, ensuring that timing-related issues are caught and resolved before reaching production. Special attention to accessibility and error handling ensures a high-quality implementation that works well for all users.
