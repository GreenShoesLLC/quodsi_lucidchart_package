# Entity Update Walkthrough

## Overview

This document provides a concrete, step-by-step walkthrough of updating an Entity's properties in the Quodsi extension. Entities represent the simplest simulation element type, making this an ideal reference for understanding the core update flow without the complexity of Activities or Models. This complements the general [element-update.md](./element-update.md) documentation with a specific example showing exact code paths, data transformations, and message flow.

## Scenario

**User Action:** User selects an Entity shape in LucidChart, changes its name from "Part" to "Widget", and clicks Save.

**What Happens:** A complete round-trip message exchange synchronizes the change from React UI → Extension → LucidChart storage → Extension → React UI.

---

## Type System and Data Transformations

Understanding the Entity type hierarchy is crucial for following the data flow:

### Core Entity Class
**File:** `shared/src/types/elements/Entity.ts`

The shared Entity class is the simplest simulation object in the system:

```typescript
class Entity extends PositionedSimulationObject {
  type: SimulationObjectType = SimulationObjectType.Entity;

  constructor(
    public id: string,
    public name: string,
    x: number = 0,
    y: number = 0
  )
}
```

**Key Characteristics:**
- **Simplest element type**: Only id, name, and position (x, y)
- **No complex nested data**: Unlike Activity (operation steps) or Model (time settings)
- **Template-based**: Represents entity template, not instances
- **Position inherited**: From PositionedSimulationObject base class

**Used by:**
- React UI for editing (EntityEditor creates Entity instances)
- Message payloads (SELECTION_CHANGED, ELEMENT_UPDATE)
- Generator entity templates (what entities are created)

### Lucid Platform Bridge
**File:** `editorextensions/quodsi_editor_extension/src/types/EntityLucid.ts`

EntityLucid bridges between LucidChart's BlockProxy and the Entity class:

```typescript
class EntityLucid extends SimObjectLucid<Entity> {
  // Reading from storage
  protected createSimObject(): Entity {
    const storedData = storageAdapter.getElementData(element);

    const entity = new Entity(
      id,
      storedData.name || 'New Entity',
      storedData.x ?? 0,
      storedData.y ?? 0
    );

    // Update from current block position
    updatePlatformSpecificFields(entity);

    return entity;
  }

  // Writing to storage
  public updateFromPlatform(): void {
    const location = block.getLocation();

    entity.setLocation(
      location.x ?? entity.x,
      location.y ?? entity.y
    );

    const dataToStore = {
      id,
      name,
      x: entity.x,
      y: entity.y
    };

    storageAdapter.updateElementData(element, dataToStore);
  }
}
```

**Key Features:**
- **BlockProxy-based**: Uses individual shape (like Activity, unlike Model)
- **Minimal data**: Only stores id, name, x, y
- **Name extraction**: Can read name from block's text areas
- **Location sync**: Updates position from current block location

**Used by:**
- Extension reading: Converts BlockProxy → Entity
- Extension writing: Converts Entity → StoredEntityData → BlockProxy custom data

### Data Flow Through Types

```
┌────────────────────────────────────────────────────────────────┐
│                    READING (Extension → React)                  │
├────────────────────────────────────────────────────────────────┤
│  BlockProxy.customData                                          │
│          ↓                                                      │
│  EntityLucid.createSimObject()                                  │
│          ↓                                                      │
│  Entity instance                                                │
│          ↓                                                      │
│  SELECTION_CHANGED message payload                             │
│          ↓                                                      │
│  React: EntityEditor receives Entity                            │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    WRITING (React → Extension)                  │
├────────────────────────────────────────────────────────────────┤
│  React: EntityEditor creates Entity instance                    │
│          ↓                                                      │
│  ELEMENT_UPDATE message payload                                │
│          ↓                                                      │
│  Extension: Entity instance                                     │
│          ↓                                                      │
│  ModelManager.saveElementData()                                 │
│          ↓                                                      │
│  StorageAdapter.updateElementData()                             │
│          ↓                                                      │
│  BlockProxy.customData (stored as JSON)                         │
└────────────────────────────────────────────────────────────────┘
```

### Key Transformations

1. **Name Extraction** (EntityLucid:108-127)
   - First checks block's text areas
   - Falls back to class name: "Entity BlockClassName"
   - User can override by editing in EntityEditor

2. **Position Sync** (EntityLucid:60-77)
   - Reads current block position from BlockProxy.getLocation()
   - Updates Entity x, y coordinates
   - Stores position in custom data
   - Allows entity to move with block on diagram

3. **Minimal Storage** (EntityLucid:97-102)
   - Only 4 fields stored: id, name, x, y
   - No nested objects or arrays
   - Simplest storage structure of all element types

4. **Default Creation** (Entity.ts:7-20)
   - `Entity.createDefault(id, x, y)` factory method
   - Creates entity with name "New Entity"
   - Used during conversion from standard block

---

## Phase 1: Selection (Extension → React)

### User Clicks Entity Shape

1. **LucidChart SDK triggers selection callback**
   - Viewport.hookSelection registered in extension startup
   - Called with selected ItemProxy[]

2. **SelectionHandler processes the selection**
   - File: `src/core/messaging/handlers/selection/SelectionHandler.ts:77-149`
   - `handleLucidSelectionEvent()` extracts shape data
   - Determines selection type (Entity)
   - Gets appropriate processor from ProcessorFactory

3. **Entity data extracted from shape**
   - Processor reads shape's custom data (stored as JSON)
   - Reads q_data field with { id, name, x, y }
   - Builds Entity data structure using EntityLucid

4. **SELECTION_CHANGED message created**
   - File: `src/core/messaging/handlers/selection/SelectionHandler.ts:144`
   - Message includes:
     - `elementId`: Shape ID
     - `type`: "Entity"
     - `data`: All Entity properties (id, name, x, y)
     - `metadata`: Simulation object type, version
     - `referenceData`: Available resources, activities for context

5. **Message sent to React panels**
   - File: `src/core/messaging/MessageRouter.ts`
   - `router.send('model', message)` broadcasts to model panel

### Console Output
```
[SelectionHandler] Handling selection change { itemCount: 1, items: ['xyz789'] }
[SelectionHandler] Selection type determined: Entity
[EntityLucid] Creating Entity from BlockProxy
[EntityLucid] Using text area content as name: Part
[MessageRouter] Sending SELECTION_CHANGED to model-iframe
```

---

## Phase 2: UI Display (React)

### React Receives Selection

1. **MessageProvider intercepts postMessage**
   - File: `quodsim-react/src/messaging/MessageProvider.tsx`
   - window.addEventListener('message', handler)
   - Validates envelope structure

2. **Mapper converts to Redux action**
   - File: `quodsim-react/src/messaging/mappers/selection.mapper.ts`
   - `mapSelection()` processes SELECTION_CHANGED
   - Creates SELECTION_UPDATE action

3. **Redux state updated**
   - File: `quodsim-react/src/messaging/state/selectionSlice.ts`
   - Stores selectedElements, referenceData, documentContext

4. **ModelPanel re-renders**
   - File: `quodsim-react/src/features/modelPanel/ModelPanel.tsx`
   - useModelPanel hook provides transformed data
   - Passes currentElement to ElementEditor

### ElementEditor Routes to EntityEditor

5. **ElementEditor determines editor type**
   - File: `quodsim-react/src/features/modelPanel/ElementEditor.tsx:168-178`
   - Switch case on element type
   - For `SimulationObjectType.Entity`: renders EntityEditor

```typescript
case SimulationObjectType.Entity:
case "Entity":
  return (
    <EntityEditor
      entity={safeElementData}
      onSave={onSave}
      onCancel={handleCancel}
      states={states}
      onStatesChange={onStatesChange}
    />
  );
```

### EntityEditor Displays Form

6. **EntityEditor is simplest editor**
   - File: `quodsim-react/src/features/editors/EntityEditor.tsx:17-141`
   - No data extraction needed - Entity already simple
   - Passes entity directly to BaseEditor with preserved methods

7. **BaseEditor wraps with form handling**
   - File: `quodsim-react/src/features/editors/BaseEditor.tsx:24-62`
   - Manages localEntity state
   - Provides handleChange function
   - Provides Save/Cancel buttons

8. **User sees the Entity editor**
   - File: `quodsim-react/src/features/editors/EntityEditor.tsx:93-119`
   - Tabbed interface: Basic, Finance (placeholder), States
   - Basic tab shows:
     - Entity Name input: displays "Part"
     - Description text: "Unique identifier for this entity template"
   - Save button enabled

### Console Output
```
[MessageProvider] Received SELECTION_CHANGED
[useModelPanel] ModelItemData details: { id: 'xyz789', name: 'Part', type: 'Entity' }
[ElementEditor] Rendering EntityEditor for type: Entity
[BaseEditor] useEffect - new data: { id: 'xyz789', name: 'Part' }
```

---

## Phase 3: User Edit (Local State)

### User Types in Name Field

1. **Input onChange handler fires**
   - File: `quodsim-react/src/features/editors/EntityEditor.tsx:105-112`
   - HTML input with `value={localEntity.name}` and `onChange={handleChange}`

```typescript
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localEntity.name}
  onChange={handleChange}
  placeholder="Enter entity name"
/>
```

2. **BaseEditor.handleChange updates local state**
   - File: `quodsim-react/src/features/editors/BaseEditor.tsx:76-90`
   - Extracts name and value from event
   - Sets `hasUnsavedChanges = true`
   - Updates localData via setLocalData

```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setHasUnsavedChanges(true);
  setLocalData((prev) => ({
    ...prev,
    [name]: value,
  }));
};
```

3. **Data transformation (local only)**
   - Before: `localEntity.name = "Part"`
   - After: `localEntity.name = "Widget"`
   - **No messages sent** - purely React component state
   - Save button styling may change (unsaved changes indicator)

### Console Output
```
[BaseEditor] handleChange: { name: 'name', value: 'Widget' }
```

---

## Phase 4: Save Click (React → Extension)

### User Clicks Save Button

1. **BaseEditor.handleSave triggered**
   - File: `quodsim-react/src/features/editors/BaseEditor.tsx:92-110`
   - Sets `isSaving = true` to prevent race conditions
   - Calls parent onSave callback

2. **EntityEditor.onSave creates Entity instance**
   - File: `quodsim-react/src/features/editors/EntityEditor.tsx:33-42`
   - Creates new Entity instance with updated data
   - Simplest of all editors - no complex transformations

```typescript
onSave={(updatedData) => {
  // Create a new Entity instance to preserve class methods
  const updatedEntity = new Entity(
    updatedData.id,
    updatedData.name,  // "Widget"
    updatedData.x,
    updatedData.y
  );

  onSave(updatedEntity);
}}
```

3. **Callback chain bubbles up**
   - EntityEditor's onSave → ElementEditor's onSave
   - ElementEditor's onSave → ModelPanel's handleElementSave
   - ModelPanel calls useModelPanel.onElementUpdate

4. **useModelPanel.onElementUpdate executes**
   - File: `quodsim-react/src/messaging/hooks/useModelPanel.ts:149-162`
   - Determines element type from metadata
   - Calls modelOpsSender.updateElementData()

```typescript
const onElementUpdate = (elementId: string, data: JsonObject) => {
  logger.log(`Updating element ${elementId} with data:`, data);

  const type = modelItemData?.metadata?.type as string || '';
  modelOpsSender.updateElementData(elementId, type, data);
};
```

### Message Creation and Sending

5. **modelOpsSender.updateElementData creates message**
   - File: `quodsim-react/src/messaging/senders/modelOpsSender.ts:79-93`
   - Creates ELEMENT_UPDATE envelope
   - Ensures elementId included in data

```typescript
const updateElementData = (
  elementId: string,
  type: string,
  data: Record<string, any>
) => {
  send(EnvelopeMessageType.ELEMENT_UPDATE, {
    elementId,
    type,
    data: {
      ...data,
      id: elementId
    }
  });
};
```

6. **useSender sends via postMessage**
   - File: `quodsim-react/src/messaging/senders/useSender.ts`
   - Creates envelope with id, type, source, target, version, data
   - Calls `window.parent.postMessage(envelope, '*')`

### Message Payload

```typescript
{
  id: "msg-1234567890",
  type: "ELEMENT_UPDATE",
  source: "model-iframe",
  target: "host",
  version: "1.0",
  data: {
    elementId: "xyz789",
    type: "Entity",
    data: {
      id: "xyz789",
      name: "Widget",  // Updated value
      x: 250,
      y: 150
    }
  }
}
```

**Note:** Payload is much simpler than Activity (no operation steps, resource requirements) or Model (no time settings, simulation parameters).

### Console Output
```
[useModelPanel] Updating element xyz789 with data: { name: 'Widget', x: 250, y: 150 }
[modelOpsSender] updateElementData called with elementId: xyz789, type: Entity
[useSender] Sending ELEMENT_UPDATE to host
```

---

## Phase 5: Extension Processing

### Message Reception

1. **RightDockPanel receives postMessage**
   - File: `src/managers/PanelManager.ts` (RightDockPanel class)
   - iframe's `relayToIframe()` receives message event
   - Validates envelope structure

2. **MessageRouter routes message**
   - File: `src/core/messaging/MessageRouter.ts`
   - `routeMessage()` checks message type
   - Routes ELEMENT_UPDATE to ElementOpsHandler

3. **ElementOpsHandler.handleMessage dispatches**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:17-41`
   - Switch on message type
   - Calls `handleElementUpdate()` async
   - Returns true immediately (async processing)

### Element Update Processing

4. **ElementOpsHandler.handleElementUpdate processes update**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:49-138`
   - Extracts elementId, type ("Entity"), data
   - Gets ModelManager and EditorClient singletons
   - Gets current page from viewport

5. **findElementById locates shape**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:290-299`
   - Searches page.allBlocks for elementId
   - Returns BlockProxy (not LineProxy)

6. **getElementType converts string to enum**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:307-335`
   - Handles "Entity" string → SimulationObjectType.Entity

### Data Persistence

7. **ModelManager.saveElementData persists to LucidChart**
   - File: `src/core/ModelManager.ts`
   - Creates or updates Entity instance in ModelDefinition
   - Calls StorageAdapter to write to shape

8. **StorageAdapter writes to shape custom data**
   - File: `src/core/StorageAdapter.ts`
   - Serializes Entity to JSON
   - Stores in shape's custom data field
   - Updates q_meta field with type information

9. **EntityLucid performs the write**
   - File: `src/types/EntityLucid.ts:79-106`
   - `updateFromPlatform()` called
   - Syncs position from current block location
   - Creates minimal storage object

```typescript
// EntityLucid.updateFromPlatform()
const location = block.getLocation();
entity.setLocation(location.x ?? entity.x, location.y ?? entity.y);

const dataToStore = {
  id: entity.id,
  name: entity.name,  // "Widget"
  x: entity.x,
  y: entity.y
};

storageAdapter.updateElementData(element, dataToStore);
```

10. **Model validation triggered**
    - File: `src/core/ModelManager.ts:validateModel()`
    - ModelValidationService checks entire model
    - Validation results cached
    - May trigger VALIDATION_RESULT message

### Success Response

11. **ELEMENT_UPDATE_RESULT message created**
    - Message ID matches original request for correlation
    - Success flag set to true
    - elementId included for reference

12. **Message sent back to React**
    - router.send('model', resultMessage)
    - Broadcasts to model-iframe channel

### Console Output
```
[ElementOpsHandler] Element update requested { elementId: 'xyz789', type: 'Entity' }
[ElementOpsHandler] Element found: BlockProxy
[ModelManager] saveElementData - elementId: xyz789, type: Entity
[StorageAdapter] Writing element data to shape xyz789
[EntityLucid] Storing updated data: { id: 'xyz789', name: 'Widget', x: 250, y: 150 }
[ModelManager] Model validation triggered
[ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: 'xyz789' }
```

---

## Phase 6: Success Response (Extension → React)

### React Receives Result

1. **MessageProvider receives ELEMENT_UPDATE_RESULT**
   - File: `quodsim-react/src/messaging/MessageProvider.tsx`
   - postMessage listener catches message
   - Validates envelope structure

2. **mapElementOps processes result**
   - File: `quodsim-react/src/messaging/mappers/elementOps.mapper.ts`
   - Converts ELEMENT_UPDATE_RESULT to Redux action
   - Extracts success status, elementId, error message

3. **Redux state updated**
   - Success/error state stored
   - May trigger notification display
   - isSaving flag can be cleared

4. **UI responds to update**
   - BaseEditor's isSaving becomes false
   - hasUnsavedChanges cleared
   - Save button returns to normal state
   - Success notification may appear (if implemented)

5. **Optional: Selection refresh**
   - Extension may re-select the element
   - Triggers new SELECTION_CHANGED message
   - React receives updated Entity data
   - Confirms name change persisted: "Widget"

### Console Output
```
[MessageProvider] Received ELEMENT_UPDATE_RESULT
[mapElementOps] Element update succeeded: { elementId: 'xyz789' }
[BaseEditor] Save completed, clearing isSaving flag
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTION                               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                1. User clicks Entity shape
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: SELECTION (Extension → React)               │
├─────────────────────────────────────────────────────────────────────────┤
│  Viewport.hookSelection → SelectionHandler → Processor                 │
│  Extract Entity data → Create SELECTION_CHANGED message                │
│  MessageRouter.send('model', message)                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: UI DISPLAY (React)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  MessageProvider → mapSelection → selectionSlice                        │
│  ModelPanel → ElementEditor → EntityEditor → BaseEditor                 │
│  Display name input: "Part"                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                2. User types "Widget"
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: USER EDIT (Local State)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Input onChange → BaseEditor.handleChange                               │
│  localEntity.name = "Widget"                                            │
│  hasUnsavedChanges = true                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                3. User clicks Save
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 PHASE 4: SAVE CLICK (React → Extension)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  BaseEditor.handleSave → EntityEditor.onSave                            │
│  → ElementEditor.onSave → useModelPanel.onElementUpdate                 │
│  → modelOpsSender.updateElementData → useSender                         │
│  window.parent.postMessage(ELEMENT_UPDATE)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  PHASE 5: EXTENSION PROCESSING                          │
├─────────────────────────────────────────────────────────────────────────┤
│  RightDockPanel.relayToIframe → MessageRouter                           │
│  → ElementOpsHandler.handleElementUpdate                                │
│  → ModelManager.saveElementData → StorageAdapter                        │
│  → Write to shape custom data → Validate model                          │
│  → Create ELEMENT_UPDATE_RESULT → MessageRouter.send                    │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│               PHASE 6: SUCCESS RESPONSE (Extension → React)             │
├─────────────────────────────────────────────────────────────────────────┤
│  MessageProvider → mapElementOps → Update state                         │
│  Clear isSaving flag → Show success notification                        │
│  Optional: Selection refresh with updated data                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Code Touchpoints Summary

| Phase | Component | File Path | Lines | Action |
|-------|-----------|-----------|-------|--------|
| Types | Entity | `shared/src/types/elements/Entity.ts` | 4-32 | Core Entity class definition |
| Types | EntityLucid | `editorextensions/quodsi_editor_extension/src/types/EntityLucid.ts` | 30-167 | Lucid platform bridge |
| 1 | SelectionHandler | `src/core/messaging/handlers/selection/SelectionHandler.ts` | 77-149 | Process selection, send SELECTION_CHANGED |
| 1 | EntityLucid | `editorextensions/quodsi_editor_extension/src/types/EntityLucid.ts` | 40-58 | Read Entity from BlockProxy |
| 2 | MessageProvider | `quodsim-react/src/messaging/MessageProvider.tsx` | - | Receive postMessage |
| 2 | mapSelection | `quodsim-react/src/messaging/mappers/selection.mapper.ts` | - | Convert to Redux action |
| 2 | ElementEditor | `quodsim-react/src/features/modelPanel/ElementEditor.tsx` | 168-178 | Route to EntityEditor |
| 2 | EntityEditor | `quodsim-react/src/features/editors/EntityEditor.tsx` | 20-45 | Display Entity form |
| 2 | Entity | `shared/src/types/elements/Entity.ts` | 22-31 | Entity constructor used |
| 2 | BaseEditor | `quodsim-react/src/features/editors/BaseEditor.tsx` | 24-62 | Manage form state |
| 3 | EntityEditor | `quodsim-react/src/features/editors/EntityEditor.tsx` | 105-112 | Name input field |
| 3 | BaseEditor | `quodsim-react/src/features/editors/BaseEditor.tsx` | 76-90 | Handle input change |
| 4 | BaseEditor | `quodsim-react/src/features/editors/BaseEditor.tsx` | 92-110 | Handle save click |
| 4 | EntityEditor | `quodsim-react/src/features/editors/EntityEditor.tsx` | 33-42 | Create Entity instance |
| 4 | Entity | `shared/src/types/elements/Entity.ts` | 22-31 | Entity constructor creates instance |
| 4 | useModelPanel | `quodsim-react/src/messaging/hooks/useModelPanel.ts` | 149-162 | Trigger update |
| 4 | modelOpsSender | `quodsim-react/src/messaging/senders/modelOpsSender.ts` | 79-93 | Create ELEMENT_UPDATE |
| 5 | RightDockPanel | `src/managers/PanelManager.ts` | - | Receive postMessage |
| 5 | MessageRouter | `src/core/messaging/MessageRouter.ts` | - | Route to handler |
| 5 | ElementOpsHandler | `src/core/messaging/handlers/elementOpsHandler.ts` | 49-138 | Process update |
| 5 | ModelManager | `src/core/ModelManager.ts` | - | Save element data |
| 5 | StorageAdapter | `src/core/StorageAdapter.ts` | - | Write to shape |
| 5 | EntityLucid | `editorextensions/quodsi_editor_extension/src/types/EntityLucid.ts` | 79-106 | Serialize Entity to storage |
| 6 | MessageProvider | `quodsim-react/src/messaging/MessageProvider.tsx` | - | Receive result |
| 6 | mapElementOps | `quodsim-react/src/messaging/mappers/elementOps.mapper.ts` | - | Process result |

---

## Complete Console Output Example

This shows the full console output for the complete flow:

```
[SelectionHandler] Handling selection change { itemCount: 1, items: ['xyz789'] }
[SelectionHandler] Selection type determined: Entity
[ProcessorFactory] Creating processor for Entity
[EntityProcessor] Extracting Entity data from shape xyz789
[EntityLucid] Creating Entity from BlockProxy
[EntityLucid] Using text area content as name: Part
[MessageRouter] Sending SELECTION_CHANGED to model-iframe

[MessageProvider] Received message: SELECTION_CHANGED
[selectionSlice] Updating selection state
[useModelPanel] ModelItemData details: { id: 'xyz789', name: 'Part', type: 'Entity' }
[ElementEditor] Rendering EntityEditor for type: Entity
[BaseEditor] useEffect - new data: { id: 'xyz789', name: 'Part' }

[BaseEditor] handleChange: { name: 'name', value: 'Widget' }

[BaseEditor] handleSave: { id: 'xyz789', name: 'Widget', x: 250, y: 150 }
[EntityEditor] Creating Entity instance with updated data
[useModelPanel] Updating element xyz789 with data: { name: 'Widget', x: 250, y: 150 }
[modelOpsSender] updateElementData called with elementId: xyz789, type: Entity
[useSender] Sending ELEMENT_UPDATE to host

[RightDockPanel] Received message from iframe: ELEMENT_UPDATE
[MessageRouter] Routing ELEMENT_UPDATE to ElementOpsHandler
[ElementOpsHandler] Element update requested { elementId: 'xyz789', type: 'Entity' }
[ElementOpsHandler] Element found: BlockProxy
[ModelManager] saveElementData - elementId: xyz789, type: Entity
[StorageAdapter] Writing element data to shape xyz789
[EntityLucid] Updating Entity from platform
[EntityLucid] Storing updated data: { id: 'xyz789', name: 'Widget', x: 250, y: 150 }
[ModelManager] Model validation triggered
[ModelValidationService] Validating model...
[ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: 'xyz789' }

[MessageProvider] Received message: ELEMENT_UPDATE_RESULT
[mapElementOps] Element update succeeded: { elementId: 'xyz789' }
[BaseEditor] Save completed, clearing isSaving flag
```

---

## Comparison with Other Element Types

### Complexity Spectrum

**Entity (Simplest):**
- 4 properties: id, name, x, y
- Single input field in UI
- Minimal storage structure
- No nested objects

**Activity (Complex):**
- 10+ properties including arrays and nested objects
- Multiple tabs: Basic, Operation Steps, Financial, Connectors, States
- Complex transformations (buffer infinity, state modifications)
- Nested operation steps with distributions

**Model (Different Category):**
- Page-level storage instead of element-level
- Time configuration (Clock vs Calendar modes)
- Simulation execution parameters
- Different selection detection (empty selection)

### Why Entity is the Reference Example

1. **Minimal Complexity**: Easiest to understand the core flow
2. **Pure Pattern**: No special cases or transformations
3. **Complete Flow**: Still demonstrates all 6 phases
4. **Building Block**: Understanding Entity makes Activity/Model easier

---

## Key Differences from Activity Update

1. **Data Complexity:**
   - Entity: 4 simple fields (id, name, x, y)
   - Activity: 10+ fields with nested arrays (operationSteps, stateModifications, financialProperties)

2. **UI Complexity:**
   - Entity: Single name input field
   - Activity: Tabbed interface with operation step editor, resource requirements, financial tracking

3. **Transformations:**
   - Entity: No transformations needed
   - Activity: Buffer infinity handling, state modifications serialization, financial properties

4. **Storage Size:**
   - Entity: ~50 bytes JSON
   - Activity: ~500+ bytes JSON (10x larger)

5. **Validation:**
   - Entity: Name must exist
   - Activity: Name, capacity > 0, operation steps valid, resource requirements valid

---

## Related Documentation

- [Element Update Exchange](./element-update.md) - General element update protocol
- [Activity Update Walkthrough](./activity-update-walkthrough.md) - Complex element example
- [Model Update Walkthrough](./model-update-walkthrough.md) - Page-level example
- [Selection Changed](../selection/selection-changed.md) - Selection message details
- [Message Protocol](../01_message_protocol.md) - Envelope structure
- [Message Lifecycle](../02_message_lifecycle.md) - General message flow patterns
