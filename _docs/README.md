# Quodsi React Application

## Overview

Quodsi React is a simulation modeling application that integrates with Lucidchart as an editor extension. It enables users to build, validate, and run simulations directly within the Lucidchart environment. The application provides a rich interface for editing simulation models, visualizing model structure, and displaying simulation results.

## Architecture

### Core Components

The application follows a clear architecture with several key components:

#### Extension Entry Point

The main entry point is located at:
```
editorextensions/quodsi_editor_extension/src/extension.ts
```

This file initializes the Lucidchart extension, sets up the ModelManager, and creates the ModelPanel that will host the React application.

#### ModelPanel

The ModelPanel (`editorextensions/quodsi_editor_extension/src/panels/ModelPanel.ts`) is responsible for:
- Managing communication between Lucidchart and the React application
- Handling selection changes in the diagram
- Processing model operations (validation, conversion, simulation)
- Managing the lifecycle of the model and its components

#### React Application

The React application is initialized in `quodsim-react/src/index.tsx`, which loads the main `QuodsiApp` component.

#### QuodsiApp Component

The `QuodsiApp` component (`quodsim-react/src/QuodsiApp.tsx`) serves as the main React application controller. It:
- Manages application state
- Sets up bidirectional communication with the extension host
- Renders the UI components
- Processes user actions and messages from the extension

#### Communication System

Communication between the Lucidchart extension and the React application is handled by `ExtensionMessaging`, a messaging system that facilitates bidirectional communication using typed messages:

- Located at: `shared/src/types/messaging/utils/ExtensionMessaging.ts`
- Uses `postMessage` to send messages between the extension and React app
- Provides a typed messaging interface with predefined message types and payloads

### State Management

The application uses React's useState for state management with a clearly defined AppState interface:

```typescript
export interface AppState {
  modelStructure: ModelStructure | null;  // The hierarchical model structure
  modelName: string;                      // The name of the current model
  validationState: ValidationState | null; // Validation results
  currentElement: ModelItemData | null;   // Currently selected element
  lastElementUpdate: string | null;       // Track element updates
  isProcessing: boolean;                  // Processing state
  error: string | null;                   // Error messages
  documentId: string | null;              // Current document ID
  diagramElementType?: DiagramElementType; // Type of diagram element
  expandedNodes: Set<string>;             // Expanded tree nodes
  referenceData: EditorReferenceData;     // Reference data for editors
  isReady: boolean;                       // Application readiness flag
  showModelName: boolean;                 // UI controls
  showModelItemName: boolean;             // UI controls
  visibleSections: {                      // UI section visibility
    header: boolean;
    validation: boolean;
    editor: boolean;
    modelTree: boolean;
  };
  simulationStatus: SimulationStatus;     // Simulation status information
}
```

### UI Components

The UI is organized in a hierarchical structure:

- `ModelPanelAccordion`: Main UI container that manages sections like model tree, element editor, and validation messages
- `Header`: Controls for model operations (validate, simulate, remove model)
- `ModelTreeView`: Tree view representation of the model structure
- `ElementEditor`: Form-based editor for simulation objects
- `ValidationMessages`: Displays validation errors and warnings

### Message Flow

1. `extension.ts` initializes the ModelPanel
2. ModelPanel loads the React application in an iframe
3. React application sends `REACT_APP_READY` message to the extension
4. ModelPanel responds with initial model state and selection
5. User interactions in React UI send messages to the extension
6. Extension processes operations and sends updated state back to React

## Data Model

The application operates with several key data types:

### ModelStructure

Hierarchical representation of the simulation model with elements and their relationships.

### ModelItemData

Represents a simulation object with:
- `id`: Unique identifier
- `data`: The object's data (properties and settings)
- `metadata`: Type information, versioning, and status
- `name`: Display name

### SimulationObjectType

Enum representing the types of simulation objects:
- `None`
- `Model`
- `Entity`
- `Generator`
- `Activity`
- `Resource`
- `Connector`
- `Scenario`

### ValidationState

Contains validation results including:
- Summary of errors and warnings
- Detailed validation messages per object
- Overall validity status

## Key Workflows

### Model Creation

1. User converts a Lucidchart page to a Quodsi model using the "Convert Page" button
2. Extension creates the model structure from diagram elements
3. React UI updates to show the model structure and properties

### Element Conversion

1. User selects an unconverted element
2. React UI shows conversion options
3. User selects an object type
4. Extension converts the element to the specified simulation object type
5. UI updates to show the object's properties editor

### Model Validation

1. User clicks "Validate" button
2. Extension performs validation checks on the model
3. Validation results are sent to React UI
4. UI displays validation messages in the validation section

### Simulation

1. User clicks "Simulate" button
2. Extension serializes the model
3. Simulation job is submitted to simulation service
4. UI shows simulation status
5. When results are available, user can view results dashboard

## Extension Development

To set up the development environment:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the React application: `npm run build` in the quodsim-react directory
4. Load the extension in Lucidchart's developer mode

## React Application Development

The React application can be developed independently:

1. Start the development server: `npm start` in the quodsim-react directory
2. Make changes to React components
3. Build the application when ready: `npm run build`

## Key Files

- `extension.ts`: Main extension entry point
- `ModelPanel.ts`: Extension panel hosting the React application
- `index.tsx`: React application entry point
- `QuodsiApp.tsx`: Main React component and application controller
- `ModelPanelAccordion.tsx`: Main UI container component
- `ExtensionMessaging.ts`: Messaging infrastructure

## Troubleshooting

Common issues:

1. **React app not loading**: Check browser console for errors in messaging setup
2. **Model not converting**: Validate Lucidchart elements have valid geometry and are supported types
3. **Simulation not starting**: Verify validation passes and all required fields are populated

## Best Practices

1. Keep UI and business logic separate
2. Use typed messages for all communication
3. Handle errors gracefully and display meaningful messages
4. Use consistent naming conventions for components and handlers
5. Document complex logic and workflows

## LLM Usage

This README is designed to be informative for both developers and Large Language Models (LLMs). When using an LLM like Claude to assist with development of this application:

1. Provide context about the specific component you're working with
2. Reference message types when discussing communication between components
3. Explain any domain-specific concepts related to simulation
4. Share error messages or issues when seeking help
5. Specify the version of the application you're working with

## Additional Resources

- Shared libraries are in the `@quodsi/shared` package
- Messaging types are defined in the shared package
- The application uses TailwindCSS for styling
- The UI follows the design system of Lucidchart for consistency
