# Quodsi React Application

## Overview

This is the React UI component of the Quodsi Simulation Modeling extension for Lucidchart. It provides an interactive user interface for building, editing, validating, and running simulation models directly within the Lucidchart environment.

## Architecture

### Application Bootstrap and Entry Points

The application starts at `src/index.tsx`, which loads the main CSS styles and bootstraps the React application by rendering the `QuodsiApp` component.

```tsx
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/quodsi-styles.css';  
import reportWebVitals from './reportWebVitals';
import QuodsiApp from './QuodsiApp';

console.log("index.tsx called")

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <QuodsiApp />
);

reportWebVitals();
```

### Core Application Component

The `QuodsiApp` component (`src/QuodsiApp.tsx`) is the main controller of the application. It:

1. Manages the application state
2. Sets up bidirectional communication with the extension host
3. Handles message passing with the parent extension
4. Renders the UI components
5. Processes user actions

The component initializes with a well-defined application state:

```typescript
export interface AppState {
  modelStructure: ModelStructure | null;
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  lastElementUpdate: string | null;
  isProcessing: boolean;
  error: string | null;
  documentId: string | null;
  diagramElementType?: DiagramElementType;
  expandedNodes: Set<string>;
  referenceData: EditorReferenceData;
  isReady: boolean;
  showModelName: boolean;
  showModelItemName: boolean;
  visibleSections: {
    header: boolean;
    validation: boolean;
    editor: boolean;
    modelTree: boolean;
  };
  simulationStatus: SimulationStatus;
}
```

### Communication System

The application uses a messaging system to communicate with the parent extension. When initialized, it sends a `REACT_APP_READY` message:

```typescript
// QuodsiApp.tsx
useEffect(() => {
  console.log("[QuodsiApp] Setting up ExtensionMessaging");
  
  // ... register message handlers ...
  
  window.addEventListener("message", handleWindowMessage);
  sendMessage(MessageTypes.REACT_APP_READY);
  
  return () => {
    window.removeEventListener("message", handleWindowMessage);
  };
}, [messaging, sendMessage]);
```

This message is received by the `ModelPanel` in the parent extension, which then initializes the model manager and sends the current model state and selection.

### UI Component Hierarchy

The main UI component is `ModelPanelAccordion`, which serves as a container for the various sections of the application:

- **Header**: Controls for model operations (validate, simulate, remove model)
- **ElementEditor**: Form-based editor for simulation objects
- **ValidationMessages**: Displays validation errors and warnings
- **ModelTreeView**: Tree view representation of the model structure

```
QuodsiApp
└── ModelPanelAccordion
    ├── Header
    ├── ElementEditor
    ├── ValidationMessages
    └── ModelTreeView
```

### State Management and Data Flow

The application uses React's `useState` hook for state management. The data flow follows this pattern:

1. User action in UI (e.g., clicking a button)
2. Event handler in UI component is triggered
3. Handler calls a method in QuodsiApp
4. QuodsiApp sends a message to the parent extension
5. Extension processes the operation
6. Extension sends a response message
7. QuodsiApp updates its state
8. UI components re-render with the new state

## Key Workflows

### Application Initialization

1. `index.tsx` renders the `QuodsiApp` component
2. `QuodsiApp` sets up message handlers
3. `QuodsiApp` sends `REACT_APP_READY` message to the parent extension
4. Parent extension (`ModelPanel`) responds with:
   - Model structure
   - Current selection
   - Validation state
   - Reference data
5. `QuodsiApp` updates its state and renders the UI

### Selection Handling

When the user selects an element in Lucidchart:

1. `ModelPanel` in the extension detects the selection change
2. `ModelPanel` sends a message to the React app with the new selection
3. `QuodsiApp` updates its state with the new selection
4. UI components re-render to show the properties of the selected element

### Element Editing

1. User makes changes in the element editor
2. User clicks "Save" button
3. `ElementEditor` calls `onSave` callback
4. `QuodsiApp` sends `UPDATE_ELEMENT_DATA` message to extension
5. Extension updates the element data
6. Extension sends `UPDATE_SUCCESS` message
7. `QuodsiApp` refreshes the UI with updated data

### Model Validation

1. User clicks "Validate" button in Header
2. `Header` calls `onValidate` callback
3. `QuodsiApp` sends `VALIDATE_MODEL` message to extension
4. Extension validates the model
5. Extension sends `VALIDATION_RESULT` message
6. `QuodsiApp` updates validation state
7. `ValidationMessages` component displays the results

### Simulation

1. User clicks "Simulate" button in Header
2. `Header` calls `onSimulate` callback
3. `QuodsiApp` sends `SIMULATE_MODEL` message to extension
4. Extension submits simulation job
5. Extension sends `SIMULATION_STARTED` message
6. Extension periodically polls for simulation status
7. `QuodsiApp` updates simulation status
8. "View Results" button appears when simulation completes
9. User clicks "View Results" to generate dashboard

## Message Types

Communication between the React application and the extension uses typed messages:

- `REACT_APP_READY`: React app is initialized and ready
- `SELECTION_CHANGED_*`: Selection changed messages (multiple types)
- `UPDATE_ELEMENT_DATA`: Update element properties
- `UPDATE_SUCCESS`: Element update successful
- `VALIDATE_MODEL`: Request model validation
- `VALIDATION_RESULT`: Response with validation results
- `SIMULATE_MODEL`: Run simulation
- `SIMULATION_STARTED`: Simulation job started
- `SIMULATION_STATUS_UPDATE`: Update on simulation status
- `VIEW_SIMULATION_RESULTS`: View simulation results dashboard
- `TREE_NODE_TOGGLE`: Toggle tree node expansion
- `TREE_STATE_UPDATE`: Update multiple tree nodes
- `CONVERT_PAGE`: Convert page to Quodsi model
- `REMOVE_MODEL`: Remove Quodsi model from page

## Hook Integration

The application uses custom hooks for specific functionality:

```typescript
// Use the simulation status hook
const { newResultsAvailable, acknowledgeResults } = useSimulationStatus(documentId || "", 30);
```

The `useSimulationStatus` hook polls for simulation result updates and provides flags to indicate when new results are available.

## Component Details

### ModelPanelAccordion

The `ModelPanelAccordion` component is the main UI container. It manages which sections are expanded and renders the appropriate components based on the current state.

```tsx
// ModelPanelAccordion.tsx
return (
  <div className="flex flex-col h-full bg-white">
    {visibleSections.header && (
      <Header
        modelName={modelName}
        validationState={validationState}
        onValidate={onValidate}
        modelItemData={currentElement}
        // ... other props ...
      />
    )}
    <div className="flex-1 overflow-y-auto">
      {visibleSections.editor &&
        !currentElement?.isUnconverted &&
        currentElement && (
          <ElementEditor
            // ... props ...
          />
        )}
      {visibleSections.validation && (
        <ValidationMessages
          // ... props ...
        />
      )}
      {visibleSections.modelTree && <ModelTreeSection />}
    </div>
  </div>
);
```

### ElementEditor

The `ElementEditor` component provides a form-based interface for editing simulation object properties. It dynamically renders the appropriate editor fields based on the element type.

### ModelTreeView

The `ModelTreeView` component renders a hierarchical tree view of the model structure. It supports:

- Expanding/collapsing nodes
- Selecting elements
- Highlighting the currently selected element
- Filtering by search term

## Development

### Local Development Setup

1. Clone the repository
2. Navigate to the `quodsim-react` directory
3. Install dependencies: `npm install`
4. Start development server: `npm start`

Note: When running locally, the app won't be able to communicate with the Lucidchart extension.

### Building for Production

To build the React application for integration with the extension:

```bash
npm run build
```

This creates optimized production files in the `build` directory that will be loaded by the extension.

### Testing

The application includes a testing setup with Jest:

```bash
npm test
```

## Integration with Parent Extension

The React application is loaded in an iframe by the `ModelPanel` class in the parent extension. The integration points are:

1. **Initialization**: React app sends `REACT_APP_READY` message
2. **Message Handling**: Both sides register handlers for specific message types
3. **State Synchronization**: Extension keeps React app updated with model state
4. **User Actions**: React app sends user actions to extension for processing

## Extension Entry Point

The extension entry point (`extension.ts`) initializes the application:

```typescript
// extension.ts
// Initialize storage adapter
const storageAdapter = new StorageAdapter();

// Initialize core model management with storage adapter
const modelManager = new ModelManager(storageAdapter);

// Initialize panel with model manager instance
console.info('[extension] About to create ModelPanel');
const modelPanel = new ModelPanel(client, modelManager);
modelPanel.setLogging(true);
console.info('[extension] Created ModelPanel2');

// Hook selection changes
viewport.hookSelection((items) => {
    modelPanel.handleSelectionChange(items);
});
```

The `ModelPanel` then loads the React application in an iframe and handles communication with it.

## ModelPanel Implementation

The `ModelPanel` class:

1. Creates the panel in Lucidchart's UI
2. Loads the React application
3. Sets up message handlers
4. Processes operations from the React app
5. Sends updated state back to the React app

A key method is `handleReactReady`, which is called when the React app signals it's ready:

```typescript
// ModelPanel.ts
private async handleReactReady(): Promise<void> {
    if (this.reactAppReady) {
        this.logError('React app already ready, skipping initialization');
        return;
    }

    this.logError('handleReactReady');
    this.reactAppReady = true;

    const viewport = new Viewport(this.client);
    const currentPage = viewport.getCurrentPage();
    const document = new DocumentProxy(this.client);

    if (!currentPage) {
        this.logError('No active page found during React ready');
        return;
    }

    try {
        // Initialize the model in response to a user-triggered event
        await this.initializeModelManager();

        // Get current selection state and send appropriate message
        const selectedItems = viewport.getSelectedItems();
        await this.handleSelectionChange(selectedItems);
    } catch (error) {
        this.handleError('Error during React ready initialization:', error);
    }
}
```

## Best Practices

1. **Typed Messages**: Use typed message definitions for all communication
2. **Error Handling**: Gracefully handle errors in both UI and extension
3. **State Management**: Keep state synchronized between UI and extension
4. **Component Separation**: Maintain clear separation of concerns between components
5. **Logging**: Use consistent logging for debugging
6. **Performance**: Optimize rendering of large model structures
7. **User Experience**: Provide clear feedback for all user actions

## Troubleshooting

### Common Issues

1. **React App Not Loading**: 
   - Check browser console for errors
   - Verify the iframe URL is correct
   - Check if the extension can access the React app resources

2. **Message Handling Issues**:
   - Ensure message types match between extension and React app
   - Verify message payloads are correctly formatted
   - Check for errors in message handling logic

3. **UI Not Updating**:
   - Verify state is being correctly updated
   - Check component rendering conditions
   - Look for errors in console

4. **Extension Integration**:
   - Make sure the extension can load the React app
   - Verify the messaging system is working
   - Check for version compatibility issues

## Additional Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Lucidchart Extension SDK](https://developer.lucid.co/)
