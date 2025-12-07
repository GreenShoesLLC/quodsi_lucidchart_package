# Activity Update Walkthrough

## Overview

This document provides a concrete, step-by-step walkthrough of the most common element update operation in the Quodsi extension: updating an Activity's properties. This complements the general [element-update.md](./element-update.md) documentation with a specific example showing exact code paths, data transformations, and message flow.

## Scenario

**User Action:** User selects an Activity shape in LucidChart, changes its name from "Assembly" to "Assembly Line", and clicks Save.

**What Happens:** A complete round-trip message exchange synchronizes the change from React UI → Extension → LucidChart storage → Extension → React UI.

---

## Type System and Data Transformations

Understanding the Activity type hierarchy is crucial for following the data flow:

### Core Activity Class

**File:** `shared/src/types/elements/Activity.ts`

The shared Activity class is the canonical representation used throughout the system:

```typescript
class Activity extends PositionedSimulationObject {
  type: SimulationObjectType = SimulationObjectType.Activity;

  constructor(
    public id: string,
    public name: string,
    public capacity: number = 1,
    public inboundQueueCapacity: number = 1,
    public outboundQueueCapacity: number = 1,
    public operationSteps: OperationStep[] = [],
    x: number = 0,
    y: number = 0
  );

  // Additional properties
  preProcessingStateModifications: StateModification[] = [];
  postProcessingStateModifications: StateModification[] = [];
  financialProperties?: ActivityFinancialProperties;
  connectType: ConnectType = ConnectType.Probability;
}
```

**Used by:**

- React UI for editing (ActivityEditor creates Activity instances)
- Message payloads (SELECTION_CHANGED, ELEMENT_UPDATE)
- Model validation and serialization

### Lucid Platform Bridge

**File:** `editorextensions/quodsi_editor_extension/src/types/ActivityLucid.ts`

ActivityLucid bridges between LucidChart's BlockProxy and the Activity class:

```typescript
class ActivityLucid extends SimObjectLucid<Activity> {
  // Reading from storage
  protected createSimObject(): Activity {
    const storedData = storageAdapter.getElementData(element);
    return new Activity(
      id,
      storedData.name,
      storedData.capacity
      // ... all properties from storage
    );
  }

  // Writing to storage
  public updateFromPlatform(): void {
    const dataToStore = {
      id,
      name,
      capacity,
      operationSteps,
      // ... serialize all Activity properties
    };
    storageAdapter.updateElementData(element, dataToStore);
  }
}
```

**Used by:**

- Extension reading: Converts BlockProxy → Activity
- Extension writing: Converts Activity → StoredActivityData → BlockProxy custom data

### Data Flow Through Types

```
┌────────────────────────────────────────────────────────────────┐
│                    READING (Extension → React)                  │
├────────────────────────────────────────────────────────────────┤
│  BlockProxy.customData                                          │
│          ↓                                                      │
│  ActivityLucid.createSimObject()                                │
│          ↓                                                      │
│  Activity instance                                              │
│          ↓                                                      │
│  SELECTION_CHANGED message payload                             │
│          ↓                                                      │
│  React: ActivityEditor receives Activity                       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    WRITING (React → Extension)                  │
├────────────────────────────────────────────────────────────────┤
│  React: ActivityEditor creates Activity instance                │
│          ↓                                                      │
│  ELEMENT_UPDATE message payload                                │
│          ↓                                                      │
│  Extension: Activity instance                                   │
│          ↓                                                      │
│  ModelManager.saveElementData()                                 │
│          ↓                                                      │
│  StorageAdapter.updateElementData()                             │
│          ↓                                                      │
│  BlockProxy.customData (stored as JSON)                         │
└────────────────────────────────────────────────────────────────┘
```

### Key Transformations

1. **Buffer Infinity Handling** (ActivityEditor:45-49)

   - Display: `999999` represents unlimited capacity
   - Storage: Converted to `Infinity` before saving
   - `bufferToDisplay(Infinity) → 999999`
   - `displayToBuffer(999999) → Infinity`

2. **State Modifications** (ActivityLucid:74-85)

   - Stored as JSON arrays
   - Deserialized to StateModification instances on read
   - `StateModification.fromJSON(data)` on read
   - `stateModification.toJSON()` on write

3. **Financial Properties** (ActivityLucid:88-90)

   - Stored as JSON object
   - Deserialized to ActivityFinancialProperties instance
   - `ActivityFinancialProperties.fromJSON(data)` on read
   - `financialProperties.toJSON()` on write

4. **Operation Steps** (ActivityEditor:119-156)
   - Array of OperationStep objects
   - Each has Duration with Distribution
   - Preserved as-is in Activity instances

---

## Phase 1: Selection (Extension → React)

### User Clicks Activity Shape

1. **LucidChart SDK triggers selection callback**

   - Viewport.hookSelection registered in extension startup
   - Called with selected ItemProxy[]

2. **SelectionHandler processes the selection**

   - File: `src/core/messaging/handlers/selection/SelectionHandler.ts:77-149`
   - `handleLucidSelectionEvent()` extracts shape data
   - Determines selection type (Activity vs Resource vs etc.)
   - Gets appropriate processor from ProcessorFactory

3. **Activity data extracted from shape**

   - Processor reads shape's custom data (stored as JSON)
   - Reads q_meta field for simulation type
   - Builds element data structure

4. **SELECTION_CHANGED message created**

   - File: `src/core/messaging/handlers/selection/SelectionHandler.ts:144`
   - Message includes:
     - `elementId`: Shape ID
     - `type`: "Activity"
     - `data`: All Activity properties (name, capacity, operationSteps, etc.)
     - `metadata`: Simulation object type, version
     - `referenceData`: Available resources, entities for dropdowns

5. **Message sent to React panels**
   - File: `src/core/messaging/MessageRouter.ts`
   - `router.send('model', message)` broadcasts to model panel

### Console Output

```
[SelectionHandler] Handling selection change { itemCount: 1, items: ['abc123'] }
[SelectionHandler] Selection type determined: Activity
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

### ElementEditor Routes to ActivityEditor

5. **ElementEditor determines editor type**
   - File: `quodsim-react/src/features/modelPanel/ElementEditor.tsx:116-141`
   - Switch case on element type
   - For `SimulationObjectType.Activity`: renders ActivityEditor

```typescript
case SimulationObjectType.Activity:
case "Activity":
case DiagramElementType.BLOCK:
  return (
    <ActivityEditor
      activity={safeElementData}
      onSave={onSave}
      onCancel={handleCancel}
      referenceData={referenceData}
      states={states}
      onStatesChange={onStatesChange}
    />
  );
```

### ActivityEditor Displays Form

6. **ActivityEditor extracts and normalizes data**

   - File: `quodsim-react/src/features/editors/ActivityEditor.tsx:51-95`
   - `extractActivityData()` creates Activity instance
   - Handles missing or malformed data
   - Preserves all properties (connectType, financialProperties, etc.)

7. **ActivityEditor manages its own state**

   - File: `quodsim-react/src/features/editors/ActivityEditor.tsx:87-130`
   - Initializes `formData` state with extracted Activity
   - Sets up `hasChanges` and `isSaving` flags
   - Configures useEffect hooks for prop synchronization
   - Provides handleChange, handleSave, handleCancel functions

8. **User sees the Activity editor**
   - File: `quodsim-react/src/features/editors/ActivityEditor.tsx:322-342`
   - Name input field displays current value: "Assembly"
   - Tabbed interface with Basic, Operation Steps, Financial, Connectors, States
   - Save/Cancel buttons at bottom of form

### Console Output

```
[MessageProvider] Received SELECTION_CHANGED
[useModelPanel] ModelItemData details: { id: 'abc123', name: 'Assembly', type: 'Activity' }
[ElementEditor] Rendering ActivityEditor for type: Activity
[ActivityEditor] Initializing form state with activity data: { id: 'abc123', name: 'Assembly', capacity: 1 }
```

---

## Phase 3: User Edit (Local State)

### User Types in Name Field

1. **Input onChange handler fires**
   - File: `quodsim-react/src/features/editors/ActivityEditor.tsx:334-341`
   - HTML input with `value={formData.name}` and `onChange={handleChange}`

```typescript
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={formData.name}
  onChange={handleChange}
  placeholder="Enter activity name"
/>
```

2. **ActivityEditor.handleChange updates local state**
   - File: `quodsim-react/src/features/editors/ActivityEditor.tsx:132-146`
   - Extracts name and value from event
   - Sets `hasChanges = true`
   - Updates formData via setFormData

```typescript
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  const { name, value } = e.target;
  setFormData((prev) => {
    const updatedActivity = new Activity(
      prev.id,
      prev.name,
      prev.capacity,
      prev.inboundQueueCapacity,
      prev.outboundQueueCapacity,
      prev.operationSteps,
      prev.x,
      prev.y
    );
    // Update the specific field
    (updatedActivity as any)[name] = value;
    // Preserve other properties
    updatedActivity.connectType = prev.connectType;
    updatedActivity.financialProperties = prev.financialProperties;
    return updatedActivity;
  });
  setHasChanges(true);
};
```

3. **Data transformation (local only)**
   - Before: `formData.name = "Assembly"`
   - After: `formData.name = "Assembly Line"`
   - **No messages sent** - purely React component state
   - Save button becomes enabled (hasChanges = true)

### Console Output

```
[ActivityEditor] handleChange: { name: 'name', value: 'Assembly Line' }
```

---

## Phase 4: Save Click (React → Extension)

### User Clicks Save Button

1. **ActivityEditor.handleSave triggered**
   - File: `quodsim-react/src/features/editors/ActivityEditor.tsx:148-168`
   - Sets `isSaving = true` to prevent race conditions
   - Transforms buffer display values (999999 → Infinity)
   - Creates new Activity instance with updated data
   - Calls parent onSave callback

```typescript
const handleSave = () => {
  setIsSaving(true);

  const activityToSave = new Activity(
    formData.id,
    formData.name, // "Assembly Line"
    formData.capacity,
    displayToBuffer(formData.inboundQueueCapacity),
    displayToBuffer(formData.outboundQueueCapacity),
    formData.operationSteps,
    formData.x,
    formData.y
  );

  activityToSave.connectType = formData.connectType;
  activityToSave.financialProperties = formData.financialProperties;
  activityToSave.preProcessingStateModifications =
    formData.preProcessingStateModifications;
  activityToSave.postProcessingStateModifications =
    formData.postProcessingStateModifications;

  onSave(activityToSave);
};
```

2. **Callback chain bubbles up**

   - ActivityEditor's onSave → ElementEditor's onSave
   - ElementEditor's onSave → ModelPanel's handleElementSave
   - ModelPanel calls useModelPanel.onElementUpdate

3. **useModelPanel.onElementUpdate executes**
   - File: `quodsim-react/src/messaging/hooks/useModelPanel.ts:149-162`
   - Determines element type from metadata
   - Calls modelOpsSender.updateElementData()

```typescript
const onElementUpdate = (elementId: string, data: JsonObject) => {
  logger.log(`Updating element ${elementId} with data:`, data);

  const type = (modelItemData?.metadata?.type as string) || "";
  modelOpsSender.updateElementData(elementId, type, data);
};
```

### Message Creation and Sending

4. **modelOpsSender.updateElementData creates message**
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
      id: elementId, // Ensure ID is included
    },
  });
};
```

5. **useSender sends via postMessage**
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
    elementId: "abc123",
    type: "Activity",
    data: {
      id: "abc123",
      name: "Assembly Line",  // Updated value
      capacity: 1,
      inboundQueueCapacity: Infinity,
      outboundQueueCapacity: Infinity,
      operationSteps: [...],
      x: 100,
      y: 200,
      connectType: "Probability",
      financialProperties: {...}
    }
  }
}
```

### Console Output

```
[useModelPanel] Updating element abc123 with data: { name: 'Assembly Line', ... }
[modelOpsSender] updateElementData called with elementId: abc123, type: Activity
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

```typescript
private static async handleElementUpdate(msg: EnvelopeBase): Promise<boolean> {
  const data = msg.data as {
    elementId: string;
    type: string;
    data: JsonObject;
  };

  try {
    // Get singletons
    const client = ModelManager.getClient();
    const modelManager = ModelManager.getInstance();

    // Get current page
    const viewport = new Viewport(client);
    const currentPage = viewport.getCurrentPage();

    // Find element by ID
    const element = ElementOpsHandler.findElementById(viewport, data.elementId);

    // Convert type string to enum
    const elementType = ElementOpsHandler.getElementType(data.type);

    // Save element data
    await modelManager.saveElementData(element, data.data, elementType, currentPage);

    // Validate model
    await modelManager.validateModel();

    // Send success response
    router.send('model', {
      id: msg.id,
      type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: {
        success: true,
        elementId: data.elementId
      }
    });

    return true;

  } catch (error) {
    // Send error response
    router.send('model', { /* error details */ });
    return false;
  }
}
```

5. **findElementById locates shape**

   - File: `src/core/messaging/handlers/elementOpsHandler.ts:290-299`
   - Searches page.allBlocks and page.allLines
   - Returns ElementProxy (BlockProxy or LineProxy)

6. **getElementType converts string to enum**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:307-335`
   - Handles both string literals ("Activity") and numeric enum values
   - Returns SimulationObjectType.Activity

### Data Persistence

7. **ModelManager.saveElementData persists to LucidChart**

   - File: `src/core/ModelManager.ts` (not shown in snippet, but similar to registerElement)
   - Creates or updates Activity instance in ModelDefinition
   - Calls StorageAdapter to write to shape

8. **StorageAdapter writes to shape custom data**

   - File: `src/core/StorageAdapter.ts`
   - Serializes Activity to JSON
   - Stores in shape's custom data field
   - Updates q_meta field with type information

9. **Model validation triggered**
   - File: `src/core/ModelManager.ts:validateModel()`
   - ModelValidationService checks entire model
   - Validation results cached
   - May trigger VALIDATION_RESULT message

### Success Response

10. **ELEMENT_UPDATE_RESULT message created**

    - Message ID matches original request for correlation
    - Success flag set to true
    - elementId included for reference

11. **Message sent back to React**
    - router.send('model', resultMessage)
    - Broadcasts to model-iframe channel

### Console Output

```
[ElementOpsHandler] Element update requested { elementId: 'abc123', type: 'Activity' }
[ElementOpsHandler] Element found: BlockProxy
[ModelManager] saveElementData - elementId: abc123, type: Activity
[StorageAdapter] Writing element data to shape abc123
[ModelManager] Model validation triggered
[ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: 'abc123' }
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

   - ActivityEditor's isSaving flag cleared after 500ms delay
   - hasChanges cleared
   - Save button becomes disabled (no changes)
   - Success notification may appear (if implemented)

5. **Optional: Selection refresh**
   - Extension may re-select the element
   - Triggers new SELECTION_CHANGED message
   - React receives updated Activity data
   - Confirms name change persisted: "Assembly Line"

### Console Output

```
[MessageProvider] Received ELEMENT_UPDATE_RESULT
[mapElementOps] Element update succeeded: { elementId: 'abc123' }
[ActivityEditor] Save completed, clearing isSaving flag after delay
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTION                               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                1. User clicks Activity shape
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: SELECTION (Extension → React)               │
├─────────────────────────────────────────────────────────────────────────┤
│  Viewport.hookSelection → SelectionHandler → Processor                 │
│  Extract Activity data → Create SELECTION_CHANGED message              │
│  MessageRouter.send('model', message)                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: UI DISPLAY (React)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  MessageProvider → mapSelection → selectionSlice                        │
│  ModelPanel → ElementEditor → ActivityEditor                            │
│  ActivityEditor initializes state, displays form                        │
│  Display name input: "Assembly"                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                2. User types "Assembly Line"
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: USER EDIT (Local State)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Input onChange → ActivityEditor.handleChange                           │
│  formData.name = "Assembly Line"                                        │
│  hasChanges = true                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                3. User clicks Save
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 PHASE 4: SAVE CLICK (React → Extension)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ActivityEditor.handleSave creates Activity instance                    │
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
│  ActivityEditor clears isSaving and hasChanges after delay              │
│  Show success notification                                              │
│  Optional: Selection refresh with updated data                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Code Touchpoints Summary

| Phase | Component         | File Path                                                             | Lines   | Action                                    |
| ----- | ----------------- | --------------------------------------------------------------------- | ------- | ----------------------------------------- |
| Types | Activity          | `shared/src/types/elements/Activity.ts`                               | 11-71   | Core Activity class definition            |
| Types | ActivityLucid     | `editorextensions/quodsi_editor_extension/src/types/ActivityLucid.ts` | 46-226  | Lucid platform bridge                     |
| 1     | SelectionHandler  | `src/core/messaging/handlers/selection/SelectionHandler.ts`           | 77-149  | Process selection, send SELECTION_CHANGED |
| 1     | ActivityLucid     | `editorextensions/quodsi_editor_extension/src/types/ActivityLucid.ts` | 56-101  | Read Activity from BlockProxy             |
| 2     | MessageProvider   | `quodsim-react/src/messaging/MessageProvider.tsx`                     | -       | Receive postMessage                       |
| 2     | mapSelection      | `quodsim-react/src/messaging/mappers/selection.mapper.ts`             | -       | Convert to Redux action                   |
| 2     | ElementEditor     | `quodsim-react/src/features/modelPanel/ElementEditor.tsx`             | 116-141 | Route to ActivityEditor                   |
| 2     | ActivityEditor    | `quodsim-react/src/features/editors/ActivityEditor.tsx`               | 51-95   | Extract and display Activity              |
| 2     | Activity          | `shared/src/types/elements/Activity.ts`                               | 57-70   | Activity constructor used                 |
| 2     | ActivityEditor    | `quodsim-react/src/features/editors/ActivityEditor.tsx`               | 87-130  | Initialize state management               |
| 3     | ActivityEditor    | `quodsim-react/src/features/editors/ActivityEditor.tsx`               | 334-341 | Name input field                          |
| 3     | ActivityEditor    | `quodsim-react/src/features/editors/ActivityEditor.tsx`               | 132-146 | Handle input change                       |
| 4     | ActivityEditor    | `quodsim-react/src/features/editors/ActivityEditor.tsx`               | 148-168 | Handle save click                         |
| 4     | ActivityEditor    | `quodsim-react/src/features/editors/ActivityEditor.tsx`               | 148-168 | Create Activity instance                  |
| 4     | Activity          | `shared/src/types/elements/Activity.ts`                               | 57-70   | Activity constructor creates instance     |
| 4     | useModelPanel     | `quodsim-react/src/messaging/hooks/useModelPanel.ts`                  | 149-162 | Trigger update                            |
| 4     | modelOpsSender    | `quodsim-react/src/messaging/senders/modelOpsSender.ts`               | 79-93   | Create ELEMENT_UPDATE                     |
| 5     | RightDockPanel    | `src/managers/PanelManager.ts`                                        | -       | Receive postMessage                       |
| 5     | MessageRouter     | `src/core/messaging/MessageRouter.ts`                                 | -       | Route to handler                          |
| 5     | ElementOpsHandler | `src/core/messaging/handlers/elementOpsHandler.ts`                    | 49-138  | Process update                            |
| 5     | ModelManager      | `src/core/ModelManager.ts`                                            | -       | Save element data                         |
| 5     | StorageAdapter    | `src/core/StorageAdapter.ts`                                          | -       | Write to shape                            |
| 5     | ActivityLucid     | `editorextensions/quodsi_editor_extension/src/types/ActivityLucid.ts` | 122-157 | Serialize Activity to storage             |
| 6     | MessageProvider   | `quodsim-react/src/messaging/MessageProvider.tsx`                     | -       | Receive result                            |
| 6     | mapElementOps     | `quodsim-react/src/messaging/mappers/elementOps.mapper.ts`            | -       | Process result                            |

---

## Complete Console Output Example

This shows the full console output for the complete flow:

```
[SelectionHandler] Handling selection change { itemCount: 1, items: ['abc123'] }
[SelectionHandler] Selection type determined: Activity
[ProcessorFactory] Creating processor for Activity
[ActivityProcessor] Extracting Activity data from shape abc123
[MessageRouter] Sending SELECTION_CHANGED to model-iframe

[MessageProvider] Received message: SELECTION_CHANGED
[selectionSlice] Updating selection state
[useModelPanel] ModelItemData details: { id: 'abc123', name: 'Assembly', type: 'Activity' }
[ElementEditor] Rendering ActivityEditor for type: Activity
[ActivityEditor] Extracting activity data: { id: 'abc123', name: 'Assembly' }
[ActivityEditor] Initializing form state with activity data: { id: 'abc123', name: 'Assembly', capacity: 1 }

[ActivityEditor] handleChange: { name: 'name', value: 'Assembly Line' }

[ActivityEditor] handleSave: Creating Activity instance with updated data
[ActivityEditor] Setting isSaving = true
[useModelPanel] Updating element abc123 with data: { name: 'Assembly Line', ... }
[modelOpsSender] updateElementData called with elementId: abc123, type: Activity
[useSender] Sending ELEMENT_UPDATE to host

[RightDockPanel] Received message from iframe: ELEMENT_UPDATE
[MessageRouter] Routing ELEMENT_UPDATE to ElementOpsHandler
[ElementOpsHandler] Element update requested { elementId: 'abc123', type: 'Activity' }
[ElementOpsHandler] Element found: BlockProxy
[ModelManager] saveElementData - elementId: abc123, type: Activity
[StorageAdapter] Writing element data to shape abc123
[ModelManager] Model validation triggered
[ModelValidationService] Validating model...
[ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: 'abc123' }

[MessageProvider] Received message: ELEMENT_UPDATE_RESULT
[mapElementOps] Element update succeeded: { elementId: 'abc123' }
[ActivityEditor] Save completed, clearing isSaving flag after 500ms delay
```

---

## Related Documentation

- [Element Update Exchange](./element-update.md) - General element update protocol
- [Selection Changed](../selection/selection-changed.md) - Selection message details
- [Message Protocol](../01_message_protocol.md) - Envelope structure
- [Message Lifecycle](../02_message_lifecycle.md) - General message flow patterns
