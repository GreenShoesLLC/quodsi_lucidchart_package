# Testing Your Autosave Implementation

This guide provides a comprehensive approach to testing the autosave functionality implemented across your editor components. Thorough testing is critical to ensure autosave works correctly, handles edge cases appropriately, and provides a good user experience.

## Testing Strategy Overview

Testing autosave functionality requires a multi-faceted approach:

1. **Unit Testing**: Testing individual components and functions
2. **Integration Testing**: Testing how components work together
3. **End-to-End Testing**: Testing the complete flow from UI to extension
4. **Performance Testing**: Measuring performance impact
5. **Accessibility Testing**: Ensuring accessibility requirements are met

## Unit Testing

Unit tests focus on individual components and functions in isolation. For autosave, key areas to test include:

### 1. BaseEditor Component

```typescript
// __tests__/components/BaseEditor.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import BaseEditor from '../../src/components/BaseEditor';
import { SimulationObjectType } from '@quodsi/shared';

// Mock timer functions
jest.useFakeTimers();

describe('BaseEditor component', () => {
  const mockSave = jest.fn();
  const mockCancel = jest.fn();
  
  const testData = {
    id: 'test-123',
    type: SimulationObjectType.Activity,
    name: 'Test Item',
    value: 42
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should debounce autosave operations', async () => {
    // Render with a simple child component
    const { getByLabelText } = render(
      <BaseEditor
        data={testData}
        onSave={mockSave}
        onCancel={mockCancel}
        messageType="testSaved"
      >
        {(localData, handleChange, setAutoSaveFields) => {
          // Register a field for autosave
          React.useEffect(() => {
            setAutoSaveFields(['value']);
          }, [setAutoSaveFields]);
          
          return (
            <div>
              <label htmlFor="value">Value</label>
              <input
                id="value"
                name="value"
                value={localData.value}
                onChange={handleChange}
              />
            </div>
          );
        }}
      </BaseEditor>
    );
    
    // Change value
    const input = getByLabelText('Value');
    fireEvent.change(input, { target: { value: '50' } });
    
    // Should not call save immediately
    expect(mockSave).not.toHaveBeenCalled();
    
    // Fast-forward half the debounce time
    act(() => {
      jest.advanceTimersByTime(400);
    });
    
    // Still should not have called save
    expect(mockSave).not.toHaveBeenCalled();
    
    // Fast-forward past debounce time
    act(() => {
      jest.advanceTimersByTime(400);
    });
    
    // Now it should have saved
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith({
      ...testData,
      value: '50'  // Value was updated
    });
  });
  
  test('should not autosave for non-registered fields', async () => {
    // Render with a child component that doesn't register any fields
    const { getByLabelText } = render(
      <BaseEditor
        data={testData}
        onSave={mockSave}
        onCancel={mockCancel}
        messageType="testSaved"
      >
        {(localData, handleChange, setAutoSaveFields) => {
          // Don't register any fields for autosave
          
          return (
            <div>
              <label htmlFor="value">Value</label>
              <input
                id="value"
                name="value"
                value={localData.value}
                onChange={handleChange}
              />
            </div>
          );
        }}
      </BaseEditor>
    );
    
    // Change value
    const input = getByLabelText('Value');
    fireEvent.change(input, { target: { value: '50' } });
    
    // Fast-forward past debounce time
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Should not have called save
    expect(mockSave).not.toHaveBeenCalled();
  });
  
  test('should validate fields before autosaving', async () => {
    // Render with validation
    const { getByLabelText } = render(
      <BaseEditor
        data={testData}
        onSave={mockSave}
        onCancel={mockCancel}
        messageType="testSaved"
      >
        {(localData, handleChange, setAutoSaveFields, setValidators) => {
          // Register field and validator
          React.useEffect(() => {
            setAutoSaveFields(['value']);
            setValidators([
              {
                field: 'value',
                validate: (value) => {
                  // Must be a number > 0
                  const numValue = Number(value);
                  if (isNaN(numValue)) return 'Must be a number';
                  if (numValue <= 0) return 'Must be greater than 0';
                  return null;
                }
              }
            ]);
          }, [setAutoSaveFields, setValidators]);
          
          return (
            <div>
              <label htmlFor="value">Value</label>
              <input
                id="value"
                name="value"
                value={localData.value}
                onChange={handleChange}
              />
            </div>
          );
        }}
      </BaseEditor>
    );
    
    // Enter invalid value
    const input = getByLabelText('Value');
    fireEvent.change(input, { target: { value: '-5' } });
    
    // Fast-forward past debounce time
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Should not have called save due to validation failure
    expect(mockSave).not.toHaveBeenCalled();
    
    // Check for validation error message
    const errorMsg = document.querySelector('.quodsi-error-message');
    expect(errorMsg).toHaveTextContent('Must be greater than 0');
    
    // Fix the value
    fireEvent.change(input, { target: { value: '10' } });
    
    // Fast-forward past debounce time
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Now it should save
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
```

### 2. AutosaveField Component

```typescript
// __tests__/components/common/AutosaveField.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AutosaveField } from '../../../src/components/common/AutosaveField';

describe('AutosaveField component', () => {
  const defaultProps = {
    label: 'Test Field',
    name: 'testField',
    value: '42',
    onChange: jest.fn(),
  };
  
  test('renders correctly with basic props', () => {
    render(<AutosaveField {...defaultProps} />);
    
    // Check basic elements
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });
  
  test('shows autosave indicator when isAutosave is true', () => {
    render(<AutosaveField {...defaultProps} isAutosave={true} />);
    
    // Check for autosave indicator
    expect(screen.getByText(/auto-saves/i)).toBeInTheDocument();
  });
  
  test('doesnt show autosave indicator when isAutosave is false', () => {
    render(<AutosaveField {...defaultProps} isAutosave={false} />);
    
    // Should not have autosave indicator
    expect(screen.queryByText(/auto-saves/i)).not.toBeInTheDocument();
  });
  
  test('shows error message when error is provided', () => {
    const errorMessage = 'This is an error';
    render(<AutosaveField {...defaultProps} error={errorMessage} />);
    
    // Check for error message
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // Error should take precedence over autosave indicator
    render(<AutosaveField {...defaultProps} error={errorMessage} isAutosave={true} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText(/auto-saves/i)).not.toBeInTheDocument();
  });
  
  test('applies correct accessibility attributes', () => {
    const { rerender } = render(<AutosaveField {...defaultProps} />);
    
    // Without error
    const input = screen.getByLabelText('Test Field');
    expect(input).not.toHaveAttribute('aria-invalid');
    
    // With error
    rerender(<AutosaveField {...defaultProps} error="Error message" />);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
  });
});
```

### 3. Validation Utilities

```typescript
// __tests__/utils/validation.test.ts
import { 
  validateRequired, 
  validateNumeric, 
  validateRange,
  validatePositive,
  validateInteger
} from '../../src/utils/validation';

describe('Validation utilities', () => {
  describe('validateRequired', () => {
    test('should validate required values', () => {
      expect(validateRequired('test', 'Field')).toBeNull();
      expect(validateRequired(42, 'Field')).toBeNull();
      expect(validateRequired(0, 'Field')).toBeNull();
      expect(validateRequired(false, 'Field')).toBeNull();
      
      expect(validateRequired('', 'Field')).toBe('Field is required');
      expect(validateRequired(null, 'Field')).toBe('Field is required');
      expect(validateRequired(undefined, 'Field')).toBe('Field is required');
    });
  });
  
  describe('validateNumeric', () => {
    test('should validate numeric values', () => {
      expect(validateNumeric(42, 'Field')).toBeNull();
      expect(validateNumeric('42', 'Field')).toBeNull();
      expect(validateNumeric('3.14', 'Field')).toBeNull();
      expect(validateNumeric('-10', 'Field')).toBeNull();
      
      expect(validateNumeric('abc', 'Field')).toBe('Field must be a number');
      expect(validateNumeric('42a', 'Field')).toBe('Field must be a number');
      expect(validateNumeric('', 'Field')).toBe('Field must be a number');
    });
  });
  
  describe('validateRange', () => {
    test('should validate value within range', () => {
      expect(validateRange(5, 0, 10, 'Field')).toBeNull();
      expect(validateRange('5', 0, 10, 'Field')).toBeNull();
      expect(validateRange(0, 0, 10, 'Field')).toBeNull();
      expect(validateRange(10, 0, 10, 'Field')).toBeNull();
      
      expect(validateRange(-1, 0, 10, 'Field')).toBe('Field must be between 0 and 10');
      expect(validateRange(11, 0, 10, 'Field')).toBe('Field must be between 0 and 10');
      expect(validateRange('