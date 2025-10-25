# Model Update Walkthrough

## Overview

This document provides a concrete, step-by-step walkthrough of updating a Model's properties in the Quodsi extension. Unlike Activity updates which modify individual elements, Model updates affect the entire simulation page's configuration. This complements the general [element-update.md](./element-update.md) documentation with a specific example showing exact code paths, data transformations, and message flow.

## Scenario

**User Action:** User clicks on the page background (no element selected), changes the model's replication count from 1 to 10, and clicks Save.

**What Happens:** A complete round-trip message exchange synchronizes the change from React UI → Extension → LucidChart page storage → Extension → React UI.

---

## Type System and Data Transformations

Understanding the Model type hierarchy is crucial for following the data flow:

### Core Model Class
**File:** `shared/src/types/elements/Model.ts`

The shared Model class is the canonical representation used throughout the system:

```typescript
class Model implements SimulationObject {
  type: SimulationObjectType = SimulationObjectType.Model;

  constructor(
    public id: string,
    public name: string,
    public reps: number,
    public forecastDays: number,
    public seed?: number,
    public oneClockUnit?: PeriodUnit,
    public simulationTimeType?: SimulationTimeType,
    public warmupClockPeriod?: number,
    public warmupClockPeriodUnit?: PeriodUnit,
    public runClockPeriod?: number,
    public runClockPeriodUnit?: PeriodUnit,
    public warmupDateTime: Date | null = null,
    public startDateTime: Date | null = null,
    public finishDateTime: Date | null = null
  )
}
```

**Key Properties:**
- `reps`: Number of simulation replications
- `seed`: Random number seed for reproducibility
- `simulationTimeType`: Clock-based or calendar-based time
- `warmupClockPeriod/runClockPeriod`: Simulation duration settings
- `forecastDays`: Forecast period for calendar-based simulations

**Used by:**
- React UI for editing (ModelEditor creates Model instances)
- Message payloads (SELECTION_CHANGED, ELEMENT_UPDATE)
- Simulation execution parameters

### Lucid Platform Bridge
**File:** `editorextensions/quodsi_editor_extension/src/types/ModelLucid.ts`

ModelLucid bridges between LucidChart's PageProxy and the Model class:

```typescript
class ModelLucid extends SimObjectLucid<Model> {
  // Reading from storage
  protected createSimObject(): Model {
    const page = element as PageProxy;
    const storedData = storageAdapter.getElementData(page);

    const model = new Model(
      id,
      storedData.name || page.getTitle(),
      storedData.reps ?? ModelDefaults.DEFAULT_REPS,
      storedData.forecastDays ?? ModelDefaults.DEFAULT_FORECAST_DAYS,
      // ... all properties from storage or defaults
    );

    return model;
  }

  // Writing to storage
  public updateFromPlatform(): void {
    const dataToStore = {
      id, name, reps, forecastDays, seed,
      oneClockUnit, simulationTimeType,
      warmupClockPeriod, warmupClockPeriodUnit,
      runClockPeriod, runClockPeriodUnit,
      warmupDateTime, startDateTime, finishDateTime
    };
    storageAdapter.updateElementData(page, dataToStore);
  }
}
```

**Key Difference from Activity:**
- Uses **PageProxy** (entire page) instead of BlockProxy (single shape)
- Model data stored on the page, not individual elements
- Validates model-wide requirements (reps > 0, forecastDays > 0)

**Used by:**
- Extension reading: Converts PageProxy → Model
- Extension writing: Converts Model → StoredModelData → PageProxy custom data

### Data Flow Through Types

```
┌────────────────────────────────────────────────────────────────┐
│                    READING (Extension → React)                  │
├────────────────────────────────────────────────────────────────┤
│  PageProxy.shapeData (page-level storage)                       │
│          ↓                                                      │
│  ModelLucid.createSimObject()                                   │
│          ↓                                                      │
│  Model instance                                                 │
│          ↓                                                      │
│  SELECTION_CHANGED message payload                             │
│          ↓                                                      │
│  React: ModelEditor receives Model                              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    WRITING (React → Extension)                  │
├────────────────────────────────────────────────────────────────┤
│  React: ModelEditor creates Model instance                      │
│          ↓                                                      │
│  ELEMENT_UPDATE message payload                                │
│          ↓                                                      │
│  Extension: Model instance                                      │
│          ↓                                                      │
│  ModelManager.saveElementData()                                 │
│          ↓                                                      │
│  StorageAdapter.updateElementData()                             │
│          ↓                                                      │
│  PageProxy.shapeData (stored as JSON)                           │
└────────────────────────────────────────────────────────────────┘
```

### Key Transformations

1. **Default Values** (ModelLucid:40-58, ModelDefaults)
   - New models initialized with sensible defaults
   - `DEFAULT_REPS = 1`
   - `DEFAULT_FORECAST_DAYS = 30`
   - `DEFAULT_SEED = 12345`
   - `DEFAULT_CLOCK_UNIT = PeriodUnit.MINUTES`

2. **Time Settings** (ModelEditor:195-241)
   - Clock mode: warmupClockPeriod, runClockPeriod with PeriodUnit
   - Calendar mode: warmupDateTime, startDateTime, finishDateTime as Date objects
   - Mode switching changes which fields are active

3. **Duration Handling** (ModelEditor:100-118)
   - EnhancedDurationEditor provides (PeriodUnit, Distribution)
   - Only Constant distribution allowed for warmup/run times
   - Distribution value extracted and stored as number
   - `distribution.parameters.value → runClockPeriod`

4. **Page Title Integration** (ModelLucid:113-116)
   - Model name defaults to page title
   - `page.getTitle() || 'Unnamed Model'`
   - Bidirectional: updating model name doesn't change page title

---

## Phase 1: Selection (Extension → React)

### User Clicks Page Background

1. **LucidChart SDK triggers selection callback**
   - Viewport.hookSelection registered in extension startup
   - Called with empty ItemProxy[] (no elements selected)

2. **SelectionHandler processes the empty selection**
   - File: `src/core/messaging/handlers/selection/SelectionHandler.ts:77-149`
   - `handleLucidSelectionEvent()` with empty items array
   - Determines selection type: Model (page-level)
   - Gets ModelProcessor from ProcessorFactory

3. **Model data extracted from page**
   - Processor reads page's custom data (stored as JSON)
   - File: `src/core/messaging/handlers/selection/processors/ModelProcessor.ts`
   - Reads q_data and q_meta fields from PageProxy.shapeData
   - Builds Model data structure using ModelLucid

4. **SELECTION_CHANGED message created**
   - File: `src/core/messaging/handlers/selection/SelectionHandler.ts:144`
   - Message includes:
     - `elementId`: Page ID
     - `type`: "Model"
     - `data`: All Model properties (name, reps, seed, time settings, etc.)
     - `metadata`: Simulation object type, version
     - `referenceData`: Available activities, resources, entities

5. **Message sent to React panels**
   - File: `src/core/messaging/MessageRouter.ts`
   - `router.send('model', message)` broadcasts to model panel

### Console Output
```
[SelectionHandler] Handling selection change { itemCount: 0, items: [] }
[SelectionHandler] Selection type determined: Model
[ModelProcessor] Reading model data from page: page123
[ModelLucid] Creating Model from PageProxy
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
   - Stores selectedElements (empty for Model)
   - Stores documentContext with isQuodsiModel flag
   - Stores Model data in appropriate state location

4. **ModelPanel re-renders**
   - File: `quodsim-react/src/features/modelPanel/ModelPanel.tsx`
   - useModelPanel hook provides transformed data
   - Detects no element selected + isQuodsiModel = show ModelEditor

### ElementEditor Routes to ModelEditor

5. **ElementEditor determines editor type**
   - File: `quodsim-react/src/features/modelPanel/ElementEditor.tsx:116-127`
   - Switch case on element type
   - For `SimulationObjectType.Model`: renders ModelEditor

```typescript
case SimulationObjectType.Model:
case "Model":
  return (
    <ModelEditor
      model={safeElementData}
      onSave={onSave}
      onCancel={handleCancel}
      states={states}
      onStatesChange={onStatesChange}
    />
  );
```

### ModelEditor Displays Form

6. **ModelEditor extracts and normalizes data**
   - File: `quodsim-react/src/features/editors/ModelEditor.tsx:35-55`
   - `extractModelData()` creates Model instance
   - Handles missing or malformed data
   - Applies defaults for all properties

7. **ModelEditor manages its own state**
   - File: `quodsim-react/src/features/editors/ModelEditor.tsx:90-133`
   - Initializes `formData` state with Model
   - Sets up `hasChanges` and `isSaving` flags
   - Configures useEffect hooks for prop synchronization
   - Provides handleChange, handleSave, handleDurationChange functions

8. **User sees the Model editor**
   - File: `quodsim-react/src/features/editors/ModelEditor.tsx:120-285`
   - Tabbed interface: Basic, Output, Finance, States
   - Basic tab shows:
     - Model name input
     - Replications count input: displays "1"
     - Time settings (Clock vs Calendar mode)
     - Warmup and Run time editors
   - Save/Cancel buttons at bottom of form

### Console Output
```
[MessageProvider] Received SELECTION_CHANGED
[useModelPanel] Document context: { isQuodsiModel: true, pageId: 'page123' }
[useModelPanel] No element selected, creating Model element from page
[ElementEditor] Rendering ModelEditor for type: Model
[ModelEditor] Extracting model data: { id: 'page123', name: 'Manufacturing Model', reps: 1 }
[ModelEditor] Initializing form state with model data: { id: 'page123', name: 'Manufacturing Model', reps: 1 }
```

---

## Phase 3: User Edit (Local State)

### User Types in Reps Field

1. **Input onChange handler fires**
   - File: `quodsim-react/src/features/editors/ModelEditor.tsx:146-156`
   - HTML input with `value={formData.reps}` and `onChange={handleChange}`

```typescript
<div>
  <label className="block text-xs text-gray-600">Reps</label>
  <input
    type="number"
    name="reps"
    className="w-full px-1 py-0.5 text-xs border rounded"
    value={formData.reps}
    onChange={handleChange}
    min="1"
  />
</div>
```

2. **ModelEditor.handleChange updates local state**
   - File: `quodsim-react/src/features/editors/ModelEditor.tsx:135-147`
   - Extracts name ("reps") and value ("10") from event
   - Sets `hasChanges = true`
   - Updates formData via setFormData

```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: name === 'reps' ? parseInt(value, 10) : value,
  }));
  setHasChanges(true);
};
```

3. **Data transformation (local only)**
   - Before: `formData.reps = 1`
   - After: `formData.reps = 10`
   - **No messages sent** - purely React component state
   - Save button becomes enabled (hasChanges = true)

### Console Output
```
[ModelEditor] handleChange: { name: 'reps', value: '10' }
```

---

## Phase 4: Save Click (React → Extension)

### User Clicks Save Button

1. **ModelEditor.handleSave triggered**
   - File: `quodsim-react/src/features/editors/ModelEditor.tsx:149-176`
   - Sets `isSaving = true` to prevent race conditions
   - Ensures all Model properties are included
   - Applies defaults for missing values
   - Calls parent onSave callback

```typescript
const handleSave = () => {
  setIsSaving(true);

  const modelToSave: Model = {
    ...formData,
    type: "Model" as any,
    reps: formData.reps || 1,  // Now 10
    seed: formData.seed || 12345,
    simulationTimeType: formData.simulationTimeType || SimulationTimeType.Clock,
    oneClockUnit: formData.oneClockUnit || PeriodUnit.MINUTES,
    warmupClockPeriod: formData.warmupClockPeriod || 0,
    warmupClockPeriodUnit: formData.warmupClockPeriodUnit || PeriodUnit.MINUTES,
    runClockPeriod: formData.runClockPeriod || 0,
    runClockPeriodUnit: formData.runClockPeriodUnit || PeriodUnit.MINUTES,
    forecastDays: formData.forecastDays || 30,
    warmupDateTime: formData.warmupDateTime || null,
    startDateTime: formData.startDateTime || null,
    finishDateTime: formData.finishDateTime || null,
  };

  onSave(modelToSave);
};
```

2. **Callback chain bubbles up**
   - ModelEditor's onSave → ElementEditor's onSave
   - ElementEditor's onSave → ModelPanel's handleElementSave
   - ModelPanel calls useModelPanel.onElementUpdate

3. **useModelPanel.onElementUpdate executes**
   - File: `quodsim-react/src/messaging/hooks/useModelPanel.ts:149-162`
   - Detects Model type from metadata
   - Calls modelOpsSender.updateElementData()

```typescript
const onElementUpdate = (elementId: string, data: JsonObject) => {
  logger.log(`Updating element ${elementId} with data:`, data);

  if (modelItemData?.metadata?.type === SimulationObjectType.Model) {
    logger.log('Updating model properties');
    modelOpsSender.updateElementData(elementId, 'Model', data);
  }
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
      id: elementId
    }
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
    elementId: "page123",
    type: "Model",
    data: {
      id: "page123",
      name: "Manufacturing Model",
      reps: 10,  // Updated value
      seed: 12345,
      forecastDays: 30,
      simulationTimeType: "Clock",
      oneClockUnit: "MINUTES",
      warmupClockPeriod: 0,
      warmupClockPeriodUnit: "MINUTES",
      runClockPeriod: 480,
      runClockPeriodUnit: "MINUTES",
      warmupDateTime: null,
      startDateTime: null,
      finishDateTime: null
    }
  }
}
```

### Console Output
```
[useModelPanel] Updating element page123 with data: { reps: 10, ... }
[modelOpsSender] updateElementData called with elementId: page123, type: Model
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
   - Extracts elementId (page123), type (Model), data
   - Gets ModelManager and EditorClient singletons
   - Gets current page from viewport

5. **findElementById locates page**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:290-299`
   - For Model type, returns PageProxy instead of BlockProxy
   - Searches `viewport.getCurrentPage()`

6. **getElementType converts string to enum**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:307-335`
   - Handles "Model" string → SimulationObjectType.Model

### Data Persistence

7. **ModelManager.saveElementData persists to LucidChart**
   - File: `src/core/ModelManager.ts`
   - Creates or updates Model instance
   - For Model type, stores on PageProxy not BlockProxy
   - Calls StorageAdapter to write to page

8. **StorageAdapter writes to page custom data**
   - File: `src/core/StorageAdapter.ts`
   - Serializes Model to JSON
   - Stores in page's shapeData field
   - Updates q_meta field with type information
   - Key difference: Uses **page-level storage**, not element storage

```typescript
// StorageAdapter stores Model data on PageProxy
page.shapeData.set('q_data', JSON.stringify(modelData));
page.shapeData.set('q_meta', JSON.stringify({
  type: SimulationObjectType.Model,
  version: '1.0.0'
}));
```

9. **Model validation triggered**
   - File: `src/core/ModelManager.ts:validateModel()`
   - ModelValidationService checks model-wide requirements
   - Validates reps > 0, forecastDays > 0
   - Checks all activities, resources, connections
   - Validation results cached

### Success Response

10. **ELEMENT_UPDATE_RESULT message created**
    - Message ID matches original request for correlation
    - Success flag set to true
    - elementId (page ID) included for reference

11. **Message sent back to React**
    - router.send('model', resultMessage)
    - Broadcasts to model-iframe channel

### Console Output
```
[ElementOpsHandler] Element update requested { elementId: 'page123', type: 'Model' }
[ElementOpsHandler] Element found: PageProxy
[ModelManager] saveElementData - elementId: page123, type: Model
[StorageAdapter] Writing model data to page page123
[ModelLucid] Serializing Model to storage: { reps: 10, ... }
[ModelManager] Model validation triggered
[ModelValidationService] Validating model-wide requirements
[ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: 'page123' }
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
   - ModelEditor's isSaving flag cleared after 500ms delay
   - hasChanges cleared
   - Save button becomes disabled (no changes)
   - Success notification may appear (if implemented)

5. **Optional: Selection refresh**
   - Extension may re-trigger selection
   - Triggers new SELECTION_CHANGED message with updated Model data
   - React receives updated Model data
   - Confirms replication change persisted: reps = 10

### Console Output
```
[MessageProvider] Received ELEMENT_UPDATE_RESULT
[mapElementOps] Element update succeeded: { elementId: 'page123' }
[ModelEditor] Save completed, clearing isSaving flag after delay
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTION                               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                1. User clicks page background (no element)
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: SELECTION (Extension → React)               │
├─────────────────────────────────────────────────────────────────────────┤
│  Viewport.hookSelection (empty items) → SelectionHandler                │
│  ModelProcessor → ModelLucid.createSimObject()                          │
│  Extract Model data from PageProxy → Create SELECTION_CHANGED          │
│  MessageRouter.send('model', message)                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: UI DISPLAY (React)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  MessageProvider → mapSelection → selectionSlice                        │
│  ModelPanel → ElementEditor → ModelEditor                               │
│  ModelEditor initializes state, displays form                           │
│  Display reps input: "1"                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                2. User types "10" in reps field
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: USER EDIT (Local State)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Input onChange → ModelEditor.handleChange                              │
│  formData.reps = 10                                                     │
│  hasChanges = true                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                3. User clicks Save
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 PHASE 4: SAVE CLICK (React → Extension)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ModelEditor.handleSave creates Model instance                          │
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
│  → Write to PageProxy shapeData → Validate model                        │
│  → Create ELEMENT_UPDATE_RESULT → MessageRouter.send                    │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│               PHASE 6: SUCCESS RESPONSE (Extension → React)             │
├─────────────────────────────────────────────────────────────────────────┤
│  MessageProvider → mapElementOps → Update state                         │
│  ModelEditor clears isSaving and hasChanges after delay                 │
│  Show success notification                                              │
│  Optional: Selection refresh with updated data                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Code Touchpoints Summary

| Phase | Component | File Path | Lines | Action |
|-------|-----------|-----------|-------|--------|
| Types | Model | `shared/src/types/elements/Model.ts` | 7-44 | Core Model class definition |
| Types | ModelLucid | `editorextensions/quodsi_editor_extension/src/types/ModelLucid.ts` | 31-123 | Lucid platform bridge |
| 1 | SelectionHandler | `src/core/messaging/handlers/selection/SelectionHandler.ts` | 77-149 | Process empty selection, send SELECTION_CHANGED |
| 1 | ModelProcessor | `src/core/messaging/handlers/selection/processors/ModelProcessor.ts` | - | Extract Model from page |
| 1 | ModelLucid | `editorextensions/quodsi_editor_extension/src/types/ModelLucid.ts` | 40-83 | Read Model from PageProxy |
| 2 | MessageProvider | `quodsim-react/src/messaging/MessageProvider.tsx` | - | Receive postMessage |
| 2 | mapSelection | `quodsim-react/src/messaging/mappers/selection.mapper.ts` | - | Convert to Redux action |
| 2 | useModelPanel | `quodsim-react/src/messaging/hooks/useModelPanel.ts` | 78-102 | Create Model from documentContext |
| 2 | ElementEditor | `quodsim-react/src/features/modelPanel/ElementEditor.tsx` | 116-127 | Route to ModelEditor |
| 2 | ModelEditor | `quodsim-react/src/features/editors/ModelEditor.tsx` | 35-55 | Extract and display Model |
| 2 | Model | `shared/src/types/elements/Model.ts` | 28-43 | Model constructor used |
| 2 | ModelEditor | `quodsim-react/src/features/editors/ModelEditor.tsx` | 90-133 | Initialize state management |
| 3 | ModelEditor | `quodsim-react/src/features/editors/ModelEditor.tsx` | 146-156 | Reps input field |
| 3 | ModelEditor | `quodsim-react/src/features/editors/ModelEditor.tsx` | 135-147 | Handle input change |
| 4 | ModelEditor | `quodsim-react/src/features/editors/ModelEditor.tsx` | 149-176 | Handle save click |
| 4 | ModelEditor | `quodsim-react/src/features/editors/ModelEditor.tsx` | 149-176 | Create Model instance |
| 4 | Model | `shared/src/types/elements/Model.ts` | 28-43 | Model constructor creates instance |
| 4 | useModelPanel | `quodsim-react/src/messaging/hooks/useModelPanel.ts` | 149-162 | Trigger update for Model |
| 4 | modelOpsSender | `quodsim-react/src/messaging/senders/modelOpsSender.ts` | 79-93 | Create ELEMENT_UPDATE |
| 5 | RightDockPanel | `src/managers/PanelManager.ts` | - | Receive postMessage |
| 5 | MessageRouter | `src/core/messaging/MessageRouter.ts` | - | Route to handler |
| 5 | ElementOpsHandler | `src/core/messaging/handlers/elementOpsHandler.ts` | 49-138 | Process update |
| 5 | ModelManager | `src/core/ModelManager.ts` | - | Save model data to page |
| 5 | StorageAdapter | `src/core/StorageAdapter.ts` | - | Write to PageProxy |
| 5 | ModelLucid | `editorextensions/quodsi_editor_extension/src/types/ModelLucid.ts` | 85-111 | Serialize Model to page storage |
| 6 | MessageProvider | `quodsim-react/src/messaging/MessageProvider.tsx` | - | Receive result |
| 6 | mapElementOps | `quodsim-react/src/messaging/mappers/elementOps.mapper.ts` | - | Process result |

---

## Complete Console Output Example

This shows the full console output for the complete flow:

```
[SelectionHandler] Handling selection change { itemCount: 0, items: [] }
[SelectionHandler] Selection type determined: Model
[ModelProcessor] Extracting Model data from page: page123
[ModelLucid] Creating Model from PageProxy
[StorageAdapter] Reading model data from page page123
[MessageRouter] Sending SELECTION_CHANGED to model-iframe

[MessageProvider] Received message: SELECTION_CHANGED
[selectionSlice] Updating selection state
[useModelPanel] Document context: { isQuodsiModel: true, pageId: 'page123' }
[useModelPanel] No element selected, creating Model element from page
[useModelPanel] ModelItemData details: { id: 'page123', type: 'Model' }
[ElementEditor] Rendering ModelEditor for type: Model
[ModelEditor] Extracting model data: { id: 'page123', name: 'Manufacturing Model', reps: 1 }
[ModelEditor] Initializing form state with model data: { id: 'page123', name: 'Manufacturing Model', reps: 1 }

[ModelEditor] handleChange: { name: 'reps', value: '10' }

[ModelEditor] handleSave: Creating Model instance with updated data
[ModelEditor] Setting isSaving = true
[useModelPanel] Updating element page123 with data: { reps: 10, ... }
[modelOpsSender] updateElementData called with elementId: page123, type: Model
[useSender] Sending ELEMENT_UPDATE to host

[RightDockPanel] Received message from iframe: ELEMENT_UPDATE
[MessageRouter] Routing ELEMENT_UPDATE to ElementOpsHandler
[ElementOpsHandler] Element update requested { elementId: 'page123', type: 'Model' }
[ElementOpsHandler] Element found: PageProxy
[ModelManager] saveElementData - elementId: page123, type: Model
[StorageAdapter] Writing model data to page page123
[ModelLucid] Serializing Model to storage: { reps: 10, seed: 12345, ... }
[ModelManager] Model validation triggered
[ModelValidationService] Validating model: reps > 0, forecastDays > 0
[ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: 'page123' }

[MessageProvider] Received message: ELEMENT_UPDATE_RESULT
[mapElementOps] Element update succeeded: { elementId: 'page123' }
[ModelEditor] Save completed, clearing isSaving flag after 500ms delay
```

---

## Key Differences from Activity Update

1. **Storage Location:**
   - Activity: Stored on BlockProxy (individual shape)
   - Model: Stored on PageProxy (entire page)

2. **Selection Detection:**
   - Activity: User selects a specific shape → non-empty items array
   - Model: User clicks background → empty items array + isQuodsiModel flag

3. **Scope:**
   - Activity: Affects single simulation element
   - Model: Affects entire simulation configuration

4. **Validation:**
   - Activity: Element-level validation (capacity > 0, operation steps valid)
   - Model: Model-wide validation (reps > 0, all elements properly connected)

5. **Data Structure:**
   - Activity: Complex nested data (operation steps, resource requirements, state modifications)
   - Model: Flatter structure (mostly primitive values and time settings)

---

## Related Documentation

- [Element Update Exchange](./element-update.md) - General element update protocol
- [Activity Update Walkthrough](./activity-update-walkthrough.md) - Activity-specific walkthrough
- [Selection Changed](../selection/selection-changed.md) - Selection message details
- [Message Protocol](../01_message_protocol.md) - Envelope structure
- [Message Lifecycle](../02_message_lifecycle.md) - General message flow patterns
