# ModelPanelAccordion Components

This directory contains the core UI components that make up the primary interface of the Quodsi simulation modeling application. The ModelPanelAccordion serves as the main container component that orchestrates the display and interaction between its child components.

## Component Overview

The components in this directory work together to provide a structured interface for:
- Displaying model information and controls
- Editing simulation object properties
- Showing validation messages
- Navigating the model hierarchy

## Key Files

### ModelPanelAccordion.tsx

**Purpose**: Main container component that manages layout and section visibility.

**Responsibilities**:
- Organizes the UI into expandable/collapsible sections
- Controls which sections are visible based on application state
- Manages expanded state of sections
- Forwards props and callbacks to child components
- Renders appropriate components based on selection context

**Props Interface**:
```typescript
interface ModelPanelAccordionProps {
  modelStructure: ModelStructure | null;
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  lastElementUpdate: string | null;
  diagramElementType?: DiagramElementType;
  expandedNodes: Set<string>;
  onElementSelect: (elementId: string) => void;
  onValidate: () => void;
  onElementUpdate: (elementId: string, data: JsonObject) => void;
  onTreeNodeToggle: (nodeId: string, expanded: boolean) => void;
  onTreeStateUpdate: (nodes: string[]) => void;
  onExpandPath: (nodeId: string) => void;
  referenceData: EditorReferenceData;
  showModelName?: boolean;
  showModelItemName?: boolean;
  visibleSections: {
    header: boolean;
    validation: boolean;
    editor: boolean;
    modelTree: boolean;
  };
  onSimulate?: (scenarioName?: string) => void;
  onRemoveModel?: () => void;
  onConvertPage?: () => void;
  onElementTypeChange: (elementId: string, newType: SimulationObjectType) => void;
  simulationStatus: SimulationStatus;
  onViewResults?: () => void;
}
```

### Header.tsx

**Purpose**: Displays model information and provides action buttons.

**Responsibilities**:
- Shows model name when viewing model
- Shows element name when an element is selected
- Provides buttons for key actions:
  - Validate
  - Simulate
  - Convert page
  - Remove model
- Displays simulation status and controls
- Shows type conversion options for elements

**Key Components**:
- ModelHeader: Header when viewing the model
- ItemHeader: Header when viewing a specific element
- SimulationControls: Controls for running simulations

### ElementEditor.tsx

**Purpose**: Form-based editor for simulation objects.

**Responsibilities**:
- Renders the appropriate editor based on element type
- Handles property changes and validation
- Manages form state
- Provides save/cancel functionality
- Coordinates with type-specific editors

**Type-Specific Editors**:
- ActivityEditor: For editing Activity objects
- ConnectorEditor: For editing Connector objects
- EntityEditor: For editing Entity objects
- GeneratorEditor: For editing Generator objects 
- ModelEditor: For editing Model objects
- ResourceEditor: For editing Resource objects

Each editor implements a common interface but provides type-specific fields and validation.

### ValidationMessages.tsx

**Purpose**: Displays validation results.

**Responsibilities**:
- Shows validation summary (error count, warning count)
- Lists validation messages with severity indicators
- Filters messages by relevance to current selection
- Groups messages by category
- Provides collapsible sections for different message types

### ModelTreeView.tsx

**Purpose**: Hierarchical tree view of model structure.

**Responsibilities**:
- Renders the model hierarchy as an expandable/collapsible tree
- Handles selection of elements from the tree
- Shows element types with appropriate icons
- Highlights the current selection
- Manages expanded/collapsed state of nodes
- Supports recursive rendering of child nodes

## Component Interaction Patterns

### State Flow

1. **State to UI**: Application state flows from QuodsiApp → ModelPanelAccordion → Child Components
2. **Events to State**: User interactions flow from Child Components → ModelPanelAccordion → QuodsiApp → Extension

### Example Workflows

#### Element Selection:
```
User clicks element in ModelTreeView
→ onSelect callback fired
→ propagated to ModelPanelAccordion.onElementSelect
→ propagated to QuodsiApp.handleElementSelect
→ QuodsiApp sends GET_ELEMENT_DATA message to extension
→ Extension responds with element data
→ QuodsiApp updates state
→ ModelPanelAccordion re-renders with selected element
→ ElementEditor shows properties of selected element
```

#### Property Update:
```
User edits property in ElementEditor
→ Local state updated in type-specific editor
→ User clicks Save
→ onSave callback fired with updated data
→ propagated to ModelPanelAccordion.onElementUpdate
→ propagated to QuodsiApp.handleElementUpdate
→ QuodsiApp sends UPDATE_ELEMENT_DATA message to extension
→ Extension updates element data
→ Extension sends update success message
→ QuodsiApp updates state
→ ModelPanelAccordion re-renders with updated element data
```

## Component Design Patterns

### Accordion Pattern

The ModelPanelAccordion uses the accordion UI pattern where sections can be expanded or collapsed independently:

```tsx
<button onClick={() => toggleSection("modelTree")} className="...">
  <span>Object Explorer</span>
  {expandedSections.modelTree ? <ChevronDown /> : <ChevronRight />}
</button>

{expandedSections.modelTree && modelStructure && rootElement && (
  <div className="...">
    <ModelTreeView {...treeProps} />
  </div>
)}
```

### Factory Pattern

The ElementEditor uses a factory pattern to create the appropriate editor based on element type:

```tsx
const getEditorComponent = () => {
  switch (elementType) {
    case SimulationObjectType.Activity:
      return <ActivityEditor data={elementData} onChange={handleChange} />;
    case SimulationObjectType.Entity:
      return <EntityEditor data={elementData} onChange={handleChange} />;
    // Other editor types...
    default:
      return <div>No editor available for this element type.</div>;
  }
};
```

### Composite Pattern

The ModelTreeView uses a composite pattern for recursively rendering tree nodes:

```tsx
const ModelTreeNode = ({ node, children, level, ...props }) => {
  // Node rendering logic
  return (
    <div>
      <NodeContent node={node} {...props} />
      {node.children && node.children.map(child => (
        <ModelTreeNode key={child.id} node={child} level={level + 1} {...props} />
      ))}
    </div>
  );
};
```

## Styling Approach

Components in this directory use:

1. **TailwindCSS**: For most styling needs via utility classes
2. **CSS Modules**: For component-specific styles that can't be easily expressed with utilities
3. **Inline styles**: Used sparingly for dynamic styles

Example:
```tsx
<div className="flex flex-col h-full bg-white">
  <div className="flex-1 overflow-y-auto">
    {/* Component content */}
  </div>
</div>
```

## Best Practices

When modifying these components:

1. **Maintain Prop Interfaces**: Keep the interfaces consistent and update them when adding new functionality
2. **Preserve Callback Patterns**: Follow the established patterns for handling events and user interactions
3. **Respect Component Boundaries**: Each component should have clear responsibilities
4. **Update Conditionally**: Use conditional rendering to ensure components only render when needed
5. **Maintain Type Safety**: Use TypeScript types consistently
6. **Performance Considerations**: Be mindful of re-rendering, especially in the ModelTreeView for large models

## Adding New Features

To add new features to these components:

1. **Understand Existing Flow**: Review the current component structure and data flow
2. **Identify Insertion Point**: Determine which component should be modified
3. **Update Props**: Add any new props needed to support the feature
4. **Implement UI**: Add the necessary UI elements
5. **Connect Events**: Wire up event handlers to the existing callback chain
6. **Update Types**: Ensure all new props and events have proper TypeScript definitions
7. **Test**: Verify the feature works in all relevant contexts

## Common Customizations

### Adding a New Editor Type

1. Create a new editor component in the appropriate directory
2. Update ElementEditor.tsx to include the new editor type
3. Update type definitions if needed
4. Connect the editor to the element update flow

### Extending Validation Messages

1. Update ValidationMessages.tsx to handle the new message types
2. Add any UI elements needed to display the new information
3. Update filtering and grouping logic if necessary

### Enhancing the Model Tree

1. Modify ModelTreeView.tsx to include new node information
2. Update rendering logic for tree nodes
3. Add any new interaction capabilities
4. Ensure performance remains acceptable for large trees
