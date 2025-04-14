# Quodsi React Components

This directory contains the UI components that make up the Quodsi simulation modeling interface. Understanding the component hierarchy and relationships is key to effectively working with and extending the application.

## Component Hierarchy

The Quodsi UI follows a hierarchical structure with well-defined responsibilities:

```
QuodsiApp (src/QuodsiApp.tsx)
└── ModelPanelAccordion (components/ModelPanelAccordion/ModelPanelAccordion.tsx)
    ├── Header (components/ModelPanelAccordion/Header.tsx)
    │   ├── ModelHeader
    │   ├── SimulationControls
    │   └── ItemHeader
    ├── ElementEditor (components/ModelPanelAccordion/ElementEditor.tsx)
    │   ├── ActivityEditor
    │   ├── ConnectorEditor
    │   ├── EntityEditor
    │   ├── GeneratorEditor
    │   ├── ModelEditor
    │   └── ResourceEditor
    ├── ValidationMessages (components/ModelPanelAccordion/ValidationMessages.tsx)
    └── ModelTreeView (components/ModelPanelAccordion/ModelTreeView.tsx)
        └── ModelTreeNode (recursive component)
```

## Core Components

### QuodsiApp

**Location**: `src/QuodsiApp.tsx`  
**Purpose**: Application controller that manages state, communication, and event handling.

- Serves as the entry point for the React application
- Manages application state using React hooks
- Establishes communication with the parent extension
- Handles message passing with the extension
- Processes user actions and forwards them to the extension
- Renders the top-level UI component (ModelPanelAccordion)

### ModelPanelAccordion

**Location**: `components/ModelPanelAccordion/ModelPanelAccordion.tsx`  
**Purpose**: Main UI container that manages layout and section visibility.

- Serves as the main layout container for the UI
- Manages which sections are visible/expanded
- Passes state and callback functions to child components
- Handles section toggling (expand/collapse)
- Coordinates interaction between components

## Section Components

### Header

**Location**: `components/ModelPanelAccordion/Header.tsx`  
**Purpose**: Displays model information and provides action buttons.

- Shows model name and current element name
- Provides buttons for key actions (validate, simulate, convert)
- Shows simulation status and controls
- Adapts to different selection contexts
- Includes type conversion controls for elements

### ElementEditor

**Location**: `components/ModelPanelAccordion/ElementEditor.tsx`  
**Purpose**: Form-based editor for simulation objects.

- Presents properties of the selected element
- Renders appropriate editor based on element type
- Handles property changes
- Validates input fields
- Provides save/cancel functionality
- Supports reference data selection (e.g., entities for generators)

### ValidationMessages

**Location**: `components/ModelPanelAccordion/ValidationMessages.tsx`  
**Purpose**: Displays validation results.

- Shows validation summary (errors, warnings)
- Lists specific validation messages
- Filters messages by relevance to selection
- Provides error navigation functionality

### ModelTreeView

**Location**: `components/ModelPanelAccordion/ModelTreeView.tsx`  
**Purpose**: Hierarchical tree view of model structure.

- Renders model hierarchy as expandable/collapsible tree
- Handles selection of elements from the tree
- Shows element types and names
- Highlights the current selection
- Manages expanded/collapsed state of nodes

## Type-Specific Editors

Located within `ElementEditor`, these components render specialized forms for different simulation object types:

### ActivityEditor

**Purpose**: Edit properties of Activity objects.
- Activity name and description
- Processing time configuration
- Resource requirements
- Input/output entity mappings

### ConnectorEditor

**Purpose**: Edit properties of Connector objects.
- Connector name and description
- Routing rules and conditions
- Destination configuration

### EntityEditor

**Purpose**: Edit properties of Entity objects.
- Entity name and attributes
- Visual representation settings
- Entity-specific properties

### GeneratorEditor

**Purpose**: Edit properties of Generator objects.
- Generator name and description
- Entity type selection
- Generation rate and pattern
- Batch size configuration
- Schedule settings

### ModelEditor

**Purpose**: Edit properties of the Model object.
- Model name and description
- Global simulation settings
- Time configuration
- Starting conditions

### ResourceEditor

**Purpose**: Edit properties of Resource objects.
- Resource name and description
- Capacity settings
- Scheduling rules
- Cost parameters

## UI Components

Located in `components/ui/`, these are reusable UI elements used throughout the application:

### ErrorDisplay

**Location**: `components/ui/ErrorDisplay.tsx`  
**Purpose**: Shows application-level error messages.

### ProcessingIndicator

**Location**: `components/ui/ProcessingIndicator.tsx`  
**Purpose**: Indicates background processing operations.

### FormComponents

**Location**: `components/ui/form/`  
**Purpose**: Reusable form controls and inputs.

- TextInput
- NumberInput
- SelectInput
- CheckboxInput
- etc.

## Component Communication

Components communicate through props and callbacks:

1. **Props Down**: State flows down from QuodsiApp to child components
   - Model structure
   - Selection state
   - Validation results
   - Reference data

2. **Events Up**: Actions flow up through callbacks
   - Element selection
   - Property updates
   - Validation requests
   - Simulation commands

Example flow for element update:
```
User edits a property in ElementEditor
→ onChange handler in specific editor (e.g., ActivityEditor)
→ onSave callback in ElementEditor
→ onElementUpdate callback in ModelPanelAccordion
→ handleElementUpdate in QuodsiApp
→ sendMessage to extension with UPDATE_ELEMENT_DATA
```

## State Management

Components receive state through props but don't modify the application state directly. Instead, they call callback functions that are passed down from the parent components, ultimately reaching QuodsiApp, which manages the application state.

## Best Practices for Component Development

1. **Component Separation**: Keep components focused on specific responsibilities
2. **Prop Typing**: Use TypeScript interfaces for component props
3. **Callback Patterns**: Follow consistent patterns for event handling
4. **Error Handling**: Include error states in components
5. **Responsive Design**: Ensure components work in different screen sizes
6. **Performance**: Optimize rendering of frequently updated components
7. **Accessibility**: Ensure components are keyboard navigable and screen reader friendly

## Adding New Components

When adding new components:

1. Create the component file in the appropriate directory
2. Define a clear interface for the component props
3. Implement the component with appropriate rendering and event handling
4. Connect it to the parent component through props and callbacks
5. Update any related types or interfaces
6. Add necessary styles
7. Test the component in different states

## Extending Existing Components

When extending existing components:

1. Understand the component's current responsibilities and state
2. Identify where to add new functionality
3. Ensure backward compatibility if possible
4. Update prop interfaces as needed
5. Modify event handlers to include new functionality
6. Update parent components if necessary to pass new props
7. Test the extended component thoroughly

## Testing Components

Components can be tested using:

1. **Unit Tests**: Test individual component rendering and behavior
2. **Integration Tests**: Test interaction between related components
3. **Manual Testing**: Verify behavior in the actual application

## Component Styling

The application uses a combination of:

1. **TailwindCSS**: For utility-based styling
2. **CSS Modules**: For component-specific styles
3. **Global Styles**: For application-wide styling

Follow existing patterns when adding or modifying styles.
