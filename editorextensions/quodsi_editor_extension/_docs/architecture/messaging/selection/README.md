# Selection & Context Messages

Element selection and document context messages.

## Messages

### [SELECTION_CHANGED](./selection-changed.md)
**Direction:** Extension → React
**Purpose:** Notify React when user selects elements in LucidChart canvas

**Triggers:**
- User selects/deselects elements
- Selection changes in viewport

**Payload Includes:**
- Selection type (Activity, Resource, None, etc.)
- Element simulation data
- Document context
- Validation state

## Selection Flow

```
User clicks element → Viewport hook → SelectionHandler →
Analyzes element → Extracts data → SELECTION_CHANGED → React
```

## Selection Types

- **Single Element:** Shows type-specific editor
- **Multiple Same Type:** Bulk edit interface
- **Mixed Types:** General properties only
- **No Selection:** Model overview

## Data Extraction

SelectionHandler extracts from LucidChart elements:
- Simulation object type
- Element properties (duration, resources, etc.)
- Validation state
- Reference data (available activities, resources)

## Integration

**Extension:**
- `SelectionHandler.handleLucidSelectionEvent()`
- Processors for each element type
- StorageAdapter for data extraction

**React:**
- `mapSelection` converts to reducer actions
- Selection slice manages state
- Element editors respond to selection
