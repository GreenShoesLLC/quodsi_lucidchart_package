# Quodsi Selection Handling Documentation

## Selection State Management

### Core Selection Types

Quodsi tracks selection state using two key interfaces:

```typescript
interface SelectionState {
    pageId: string;
    selectedIds: string[];
    selectionType: SelectionType;
}

enum SelectionType {
    NONE = 'none',
    MULTIPLE = 'multiple',
    UNKNOWN_BLOCK = 'unknown_block',
    UNKNOWN_LINE = 'unknown_line',
    ACTIVITY = 'activity',
    CONNECTOR = 'connector',
    ENTITY = 'entity',
    GENERATOR = 'generator',
    RESOURCE = 'resource',
    MODEL = 'model'
}
```

The `SelectionState` provides a complete picture of what's currently selected in the LucidChart diagram, including:
- The current page ID
- Array of selected element IDs
- The type of selection (mapped from SimulationObjectType to SelectionType)

## Selection Change Flow

### 1. ModelPanel Selection Handling

The ModelPanel class serves as the initial handler for selection changes in LucidChart. It implements:

```typescript
public handleSelectionChange(items: ItemProxy[]): void {
    // Updates current selection state
    this.updateSelectionState(currentPage, items);
    
    // If React app is ready, sends selection data
    if (this.reactAppReady) {
        const elementData = items.map(item => ({
            id: item.id,
            data: this.storageAdapter.getElementData(item),
            metadata: this.storageAdapter.getMetadata(item)
        }));

        this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
            selectionState: this.currentSelection,
            elementData: elementData
        });
    }
}
```

### 2. Message Handling in QuodsiApp

QuodsiApp.tsx receives and processes the selection change message:

1. Message Reception:
```typescript
case MessageTypes.SELECTION_CHANGED:
    if (message.data?.elementData) {
        messageHandlers.handleSelectionChanged(message.data, deps);
    }
```

2. Selection Change Handling:
- Single Element Selected:
  - Creates appropriate editor based on element type
  - Shows component selector
  - Displays element properties
- Multiple Elements:
  - Clears editor
  - Shows appropriate message
- No Selection (Page Selected):
  - If model exists, shows model editor
  - Otherwise shows conversion options

## Editor Component Creation

The system dynamically creates editors based on selection type:

```typescript
const editor = createEditorComponent(
    elementType,
    element.data,
    {
        onSave: handleSave,
        onCancel: handleCancel,
        onTypeChange: handleComponentTypeChange,
    },
    state.isProcessing
);
```

Available editors include:
- ActivityEditor
- ConnectorEditor
- EntityEditor
- GeneratorEditor
- ResourceEditor
- ModelEditor

## Selection-Based UI Updates

The selection flow results in these UI changes:

1. **Single Element Selected**:
   - Shows SimulationComponentSelector
   - Displays appropriate element editor
   - Enables type changing if applicable

2. **Page/Model Selected**:
   - Shows ModelTabs component
   - Displays model utilities (validate, remove, simulate)

3. **Multiple Elements Selected**:
   - Clears editor
   - Shows appropriate message

4. **No Selection**:
   - Shows default state or model utilities

## Error Handling

The selection system includes robust error handling:

```typescript
if (!message.data?.elementData) {
    console.warn("Selection changed but no element data provided");
    return;
}
```

Key error scenarios handled:
- Invalid selection data
- Missing element metadata
- Unknown element types
- Failed editor creation

## Component Type Mapping

The system maps between SimulationObjectType and SelectionType:

```typescript
private mapElementTypeToSelectionType(elementType: SimulationObjectType): SelectionType {
    switch (elementType) {
        case SimulationObjectType.Activity:
            return SelectionType.ACTIVITY;
        case SimulationObjectType.Connector:
            return SelectionType.CONNECTOR;
        // ... other mappings
    }
}
```

This mapping ensures consistent handling of element types throughout the selection process.
