# Testing and Integration Guide

This document outlines the strategy for testing new components and integrating them with the existing application.

## Testing Approach

### 1. Component Testing

Start by testing each component in isolation:

1. **Unit Tests**: Create tests for individual component logic
2. **Component Rendering Tests**: Verify components render correctly with different props
3. **Integration Tests**: Test interaction between related components

**Sample Jest Test for useModelPanel Hook:**

```tsx
// __tests__/hooks/useModelPanel.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useModelPanel } from '../../messaging/hooks/useModelPanel';
import { useMessaging } from '../../messaging/useMessaging';

// Mock the useMessaging hook
jest.mock('../../messaging/useMessaging', () => ({
  useMessaging: jest.fn()
}));

describe('useModelPanel hook', () => {
  beforeEach(() => {
    // Set up mock data for useMessaging
    (useMessaging as jest.Mock).mockReturnValue({
      selection: {
        selectedElements: [
          {
            id: 'test-id',
            type: 'block',
            text: 'Test Element'
          }
        ],
        documentContext: {
          documentId: 'doc-1',
          pageId: 'page-1',
          documentTitle: 'Test Document',
          isQuodsiModel: true,
          totalElements: 10
        },
        lastUpdated: 123456789
      },
      validation: {
        currentValidation: {
          isValid: true,
          errorCount: 0,
          warningCount: 0,
          messages: []
        }
      },
      simulation: {
        status: {
          pageStatus: null,
          isPollingSimState: false,
          errorMessage: null,
          lastChecked: null,
          newResultsAvailable: false
        },
        currentScenarioId: null
      },
      app: {
        initialized: true
      },
      sendMessage: jest.fn()
    });
  });
  
  it('should transform selection data correctly', () => {
    const { result } = renderHook(() => useModelPanel());
    
    expect(result.current.modelName).toBe('Test Document');
    expect(result.current.currentElement).toBeTruthy();
    expect(result.current.currentElement.id).toBe('test-id');
    expect(result.current.needsInitialization).toBe(false);
  });
  
  it('should call sendMessage with correct parameters for element update', () => {
    const { result } = renderHook(() => useModelPanel());
    const sendMessage = (useMessaging as jest.Mock).mock.results[0].value.sendMessage;
    
    act(() => {
      result.current.onElementUpdate('test-id', { name: 'Updated Name' });
    });
    
    expect(sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        elementId: 'test-id',
        data: { name: 'Updated Name' }
      })
    );
  });
});
```

**Sample Jest Test for ModelPanel Component:**

```tsx
// __tests__/components/ModelPanel.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelPanel } from '../../features/modelPanel/ModelPanel';
import { useModelPanel } from '../../messaging/hooks/useModelPanel';

// Mock the useModelPanel hook
jest.mock('../../messaging/hooks/useModelPanel', () => ({
  useModelPanel: jest.fn()
}));

describe('ModelPanel component', () => {
  beforeEach(() => {
    // Set up mock data for useModelPanel
    (useModelPanel as jest.Mock).mockReturnValue({
      modelName: 'Test Model',
      currentElement: {
        id: 'element-1',
        name: 'Activity 1',
        data: { capacity: 5 },
        metadata: {
          type: 'Activity',
          version: '1.0',
          lastModified: '2023-01-01',
          id: 'element-1'
        }
      },
      validationState: {
        isValid: true,
        messages: [],
        summary: { errorCount: 0, warningCount: 0 }
      },
      isLoading: false,
      needsInitialization: false,
      referenceData: { entities: [], resources: [] },
      diagramElementType: 'BLOCK',
      onElementUpdate: jest.fn(),
      onElementTypeChange: jest.fn(),
      onValidate: jest.fn(),
      onSimulate: jest.fn(),
      onRemoveModel: jest.fn(),
      onConvertPage: jest.fn(),
      onViewResults: jest.fn()
    });
  });
  
  it('should render the component with model name', () => {
    render(<ModelPanel />);
    expect(screen.getByText('Test Model')).toBeInTheDocument();
  });
  
  it('should render initialization button when needs initialization', () => {
    (useModelPanel as jest.Mock).mockReturnValue({
      ...useModelPanel(),
      needsInitialization: true
    });
    
    render(<ModelPanel />);
    expect(screen.getByText('Initialize Quodsi Model')).toBeInTheDocument();
  });
  
  it('should call onElementUpdate when saving element data', () => {
    render(<ModelPanel />);
    
    // Find the editor and simulate save
    // This depends on the actual implementation of ElementEditor
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(useModelPanel().onElementUpdate).toHaveBeenCalled();
  });
});
```

### 2. Message Handling Testing

Verify that messages are correctly processed and transformed:

```tsx
// __tests__/mappers/modelItem.mapper.test.ts
import { transformToModelItemData } from '../../messaging/mappers/modelItem.mapper';

describe('modelItem.mapper', () => {
  it('should transform element shape to ModelItemData', () => {
    const input = {
      id: 'test-id',
      type: 'block',
      text: 'Test Element'
    };
    
    const result = transformToModelItemData(input);
    
    expect(result).toEqual({
      id: 'test-id',
      name: 'Test Element',
      data: {},
      metadata: {
        type: expect.any(String),
        version: expect.any(String),
        lastModified: expect.any(String),
        id: 'test-id'
      }
    });
  });
  
  it('should preserve existing ModelItemData structure', () => {
    const input = {
      id: 'test-id',
      name: 'Original Name',
      data: { custom: 'data' },
      metadata: {
        type: 'Activity',
        version: '1.0',
        lastModified: '2023-01-01',
        id: 'test-id'
      }
    };
    
    const result = transformToModelItemData(input);
    
    expect(result).toEqual(input);
  });
});
```

### 3. Integration Testing

Test the complete flow from messaging to UI rendering:

```tsx
// __tests__/integration/modelPanel.integration.test.tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MessageProvider } from '../../messaging/MessageProvider';
import { LucidApp } from '../../components/LucidApp';
import { EnvelopeMessageType } from '@quodsi/shared';

// Mock postMessage to simulate host communication
const mockPostMessage = jest.fn();
window.parent.postMessage = mockPostMessage;

describe('Model Panel Integration', () => {
  beforeEach(() => {
    // Clear mocks
    mockPostMessage.mockClear();
  });
  
  it('should render model panel and process selection message', async () => {
    // Render with message provider
    render(
      <MessageProvider initialPanelType="model">
        <LucidApp panelType="model" />
      </MessageProvider>
    );
    
    // Simulate receiving a selection message
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: {
          id: 'test-msg-1',
          type: EnvelopeMessageType.SELECTION_CHANGED,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            selectionType: 'ACTIVITY',
            documentId: 'doc-1',
            hasModel: true,
            selectionState: {
              pageId: 'page-1',
              selectedIds: ['element-1'],
              selectionType: 'ACTIVITY'
            },
            selectedElements: [{
              id: 'element-1',
              type: 'block',
              text: 'Activity 1'
            }],
            documentContext: {
              documentId: 'doc-1',
              pageId: 'page-1',
              title: 'Test Document',
              isQuodsiModel: true
            },
            modelItemData: {
              id: 'element-1',
              name: 'Activity 1',
              data: { capacity: 5 },
              metadata: {
                type: 'Activity',
                version: '1.0',
                lastModified: '2023-01-01',
                id: 'element-1'
              }
            },
            diagramElementType: 'BLOCK'
          }
        }
      }));
    });
    
    // Wait for rendering to complete
    await screen.findByText('Activity 1');
    
    // Verify UI reflects the selection
    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('Activity 1')).toBeInTheDocument();
    expect(screen.getByText('Edit Activity')).toBeInTheDocument();
  });
  
  it('should send action messages when interacting with UI', async () => {
    // Render with message provider
    render(
      <MessageProvider initialPanelType="model">
        <LucidApp panelType="model" />
      </MessageProvider>
    );
    
    // Simulate receiving initial data
    // [Same as above]
    
    // Find and click the simulate button
    const simulateButton = await screen.findByText('Simulate');
    act(() => {
      simulateButton.click();
    });
    
    // Verify the correct message was sent
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EnvelopeMessageType.SIMULATE_MODEL
      }),
      expect.any(String)
    );
  });
});
```

## Integration Strategy

The following steps outline the process for integrating the new components into the application:

### 1. Parallel Implementation

Keep both old and new components during development:

```tsx
// App_new.tsx 
export const App_new: React.FC<AppNewProps> = ({ panelType }) => {
  // ...existing code...
  
  // Feature flag for new ModelPanel
  const useNewModelPanel = false; // Toggle this for testing
  
  return (
    <MsalProvider instance={msalInstance}>
      <MessageProvider initialPanelType={currentPanelType}>
        <div className="app-new-container">
          <LucidApp 
            panelType={currentPanelType}
            useNewModelPanel={useNewModelPanel} 
          />
        </div>
      </MessageProvider>
    </MsalProvider>
  );
};

// LucidApp.tsx
export const LucidApp: React.FC<LucidAppProps> = ({ 
  panelType = "model",
  useNewModelPanel = false 
}) => {
  // ...existing code...
  
  // Model panel content - conditionally use the new panel
  return (
    <div className="lucid-app">
      <div className="new-messaging-header bg-amber-300 mb-2 p-1 text-center font-bold">
        New Messaging Implementation {useNewModelPanel && '- New ModelPanel'}
      </div>
      
      {useNewModelPanel ? (
        <ModelPanel />
      ) : (
        <div>
          {/* Original UI */}
          <h1>Quodsi Model Panel</h1>
          {/* State debugging output */}
        </div>
      )}
    </div>
  );
};
```

### 2. Incremental Feature Adoption

Implement features incrementally and test each:

1. **Phase 1**: Display model name and basic selection info
2. **Phase 2**: Add element editing capability
3. **Phase 3**: Add validation display
4. **Phase 4**: Add simulation controls

Use feature flags to control which parts of the new UI are active:

```tsx
const features = {
  newModelPanel: true,
  elementEditing: true,
  validationDisplay: true,
  simulationControls: false // Still using old implementation
};

// Then in ModelPanel.tsx
return (
  <div className="flex flex-col h-full bg-white">
    <PanelHeader
      modelName={modelName}
      currentElement={currentElement}
      // ... other props ...
    />
    
    <div className="flex-1 overflow-y-auto">
      {features.elementEditing && currentElement && (
        <ElementEditor
          // ... props ...
        />
      )}
      
      {features.validationDisplay && (
        <ValidationPanel
          // ... props ...
        />
      )}
      
      {features.simulationControls ? (
        <SimulationControls
          // ... props ...
        />
      ) : (
        // Use old SimulationStatusMonitor instead
        <div className="legacy-simulation">
          {/* Render old component or a placeholder */}
        </div>
      )}
    </div>
  </div>
);
```

### 3. Side-by-Side Testing

Create a special development mode that allows comparing old and new UIs:

```tsx
// DevComparisonView.tsx
export const DevComparisonView: React.FC = () => {
  // Get the same data source for both views
  const modelPanelData = useModelPanel();
  
  return (
    <div className="comparison-container">
      <div className="comparison-header">
        <h2>Component Comparison View</h2>
        <span className="badge">Development Only</span>
      </div>
      
      <div className="comparison-panels">
        <div className="panel-container">
          <h3>Original Implementation</h3>
          <ModelPanelAccordion
            modelName={modelPanelData.modelName}
            validationState={modelPanelData.validationState}
            currentElement={modelPanelData.currentElement}
            // ... other props ...
          />
        </div>
        
        <div className="panel-container">
          <h3>New Implementation</h3>
          <ModelPanel />
        </div>
      </div>
    </div>
  );
};
```

### 4. Final Cutover

Once all functionality is implemented and tested:

1. Remove feature flags
2. Remove old component references
3. Update `LucidApp` to use only the new implementation
4. Remove development comparison tools
5. Update documentation

## Performance Testing

Before final release, test performance aspects:

1. **Render Time**: Measure initial render time for both implementations
2. **Re-render Efficiency**: Monitor unnecessary re-renders
3. **Memory Usage**: Check for memory leaks or excessive allocations
4. **Message Processing**: Measure time to process and display selection changes

Use React DevTools Profiler or performance measurement hooks:

```tsx
// Performance measurement example
function useComponentMetrics(componentName) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    const renderTime = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    console.log(`[${componentName}] Render #${renderCount.current} took ${renderTime.toFixed(2)}ms`);
    
    return () => {
      console.log(`[${componentName}] Component unmounted after ${renderCount.current} renders`);
    };
  });
  
  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current
  };
}
```

## Error Handling Strategy

Implement robust error boundaries around new components:

```tsx
// ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Component error:', error, errorInfo);
    // Optionally send to error reporting service
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container p-4 bg-red-50 border border-red-300 rounded">
          <h3 className="text-red-700">Something went wrong</h3>
          <details className="mt-2 text-sm">
            <summary>Error details</summary>
            <p className="mt-1 font-mono text-xs text-red-600">
              {this.state.error?.toString()}
            </p>
          </details>
          <button
            className="mt-3 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <ModelPanel />
</ErrorBoundary>
```

## Versioning Strategy

Tag versions of the new implementation to allow rollback if needed:

1. **v1.0-alpha**: Initial implementation with basic features
2. **v1.0-beta**: Complete feature parity with original
3. **v1.0**: Production-ready implementation

Use git tags to mark these milestones:

```bash
git tag -a model-panel-v1.0-alpha -m "Initial ModelPanel implementation"
git tag -a model-panel-v1.0-beta -m "Feature complete ModelPanel"
git tag -a model-panel-v1.0 -m "Production ModelPanel"
```
