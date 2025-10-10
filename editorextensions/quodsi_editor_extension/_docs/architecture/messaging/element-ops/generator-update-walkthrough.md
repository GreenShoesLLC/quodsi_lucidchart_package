# Generator Update Walkthrough

## Overview

This document provides a concrete, step-by-step walkthrough of updating a Generator's properties in the Quodsi extension. Generators represent entity creation sources in the simulation, featuring Duration objects for timing control and entity template selection. This complements the general [element-update.md](./element-update.md) documentation with a specific example showing exact code paths, data transformations, and message flow.

## Scenario

**User Action:** User selects a Generator shape in LucidChart, changes the interarrival time from "1 hour" to "30 minutes", and clicks Save.

**What Happens:** A complete round-trip message exchange synchronizes the change from React UI → Extension → LucidChart storage → Extension → React UI.

---

## Type System and Data Transformations

Understanding the Generator type hierarchy is crucial for following the data flow:

### Core Generator Class
**File:** `shared/src/types/elements/Generator.ts`

The shared Generator class controls entity creation in simulations:

```typescript
class Generator extends PositionedSimulationObject {
  type: SimulationObjectType = SimulationObjectType.Generator;

  initialStateModifications: StateModification[] = [];

  constructor(
    public id: string,
    public name: string,
    public activityKeyId: string = "",
    public entityId: string = ModelDefaults.DEFAULT_ENTITY_ID,
    public periodicOccurrences: number = Infinity,
    public periodIntervalDuration: Duration = new Duration(),
    public entitiesPerCreation: number = 1,
    public periodicStartDuration: Duration = new Duration(),
    public maxEntities: number = Infinity,
    x: number = 0,
    y: number = 0
  )
}
```

**Key Properties:**
- `entityId`: Which entity template to create (references Entity)
- `periodIntervalDuration`: Time between entity creations (Duration object)
- `periodicStartDuration`: Delay before first creation (Duration object)
- `periodicOccurrences`: How many times to create entities
- `entitiesPerCreation`: Batch size for each creation
- `maxEntities`: Total entity limit
- `initialStateModifications`: State values for created entities

**Complexity Level:**
- More complex than Entity (has Duration objects, entity references)
- Simpler than Activity (no operation steps arrays)
- Duration objects similar to Model's time settings

**Used by:**
- React UI for editing (GeneratorEditor creates Generator instances)
- Message payloads (SELECTION_CHANGED, ELEMENT_UPDATE)
- Simulation execution for entity arrival patterns

### Lucid Platform Bridge
**File:** `editorextensions/quodsi_editor_extension/src/types/GeneratorLucid.ts`

GeneratorLucid bridges between LucidChart's BlockProxy and the Generator class:

```typescript
class GeneratorLucid extends SimObjectLucid<Generator> {
  // Reading from storage
  protected createSimObject(): Generator {
    const storedData = storageAdapter.getElementData(element);

    const generator = new Generator(
      id,
      storedData.name || 'New Generator',
      storedData.activityKeyId || '',
      storedData.entityId || ModelDefaults.DEFAULT_ENTITY_ID,
      storedData.periodicOccurrences ?? Infinity,
      storedData.periodIntervalDuration
        ? new Duration(
            storedData.periodIntervalDuration.durationPeriodUnit,
            storedData.periodIntervalDuration.distribution
          )
        : new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)),
      storedData.entitiesPerCreation ?? 1,
      storedData.periodicStartDuration
        ? new Duration(
            storedData.periodicStartDuration.durationPeriodUnit,
            storedData.periodicStartDuration.distribution
          )
        : new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)),
      storedData.maxEntities ?? Infinity,
      storedData.x ?? 0,
      storedData.y ?? 0
    );

    // Deserialize state modifications
    if (storedData.initialStateModifications) {
      generator.initialStateModifications = storedData.initialStateModifications.map(
        data => StateModification.fromJSON(data)
      );
    }

    return generator;
  }

  // Writing to storage
  public updateFromPlatform(): void {
    const dataToStore = {
      id, name, activityKeyId, entityId,
      periodicOccurrences,
      periodIntervalDuration: {
        durationPeriodUnit: generator.periodIntervalDuration.durationPeriodUnit,
        distribution: generator.periodIntervalDuration.distribution
      },
      entitiesPerCreation,
      periodicStartDuration: {
        durationPeriodUnit: generator.periodicStartDuration.durationPeriodUnit,
        distribution: generator.periodicStartDuration.distribution
      },
      maxEntities,
      initialStateModifications: generator.initialStateModifications.map(m => m.toJSON()),
      x: generator.x,
      y: generator.y
    };

    storageAdapter.updateElementData(element, dataToStore);
  }
}
```

**Key Features:**
- **BlockProxy-based**: Uses individual shape (like Activity, Entity)
- **Duration reconstruction**: Recreates Duration objects from stored data
- **Entity reference**: Stores entity ID, not full entity object
- **State modifications**: Serializes/deserializes like Activity

**Used by:**
- Extension reading: Converts BlockProxy → Generator
- Extension writing: Converts Generator → StoredGeneratorData → BlockProxy custom data

### Data Flow Through Types

```
┌────────────────────────────────────────────────────────────────┐
│                    READING (Extension → React)                  │
├────────────────────────────────────────────────────────────────┤
│  BlockProxy.customData                                          │
│          ↓                                                      │
│  GeneratorLucid.createSimObject()                               │
│          ↓                                                      │
│  Generator instance (with Duration objects)                     │
│          ↓                                                      │
│  SELECTION_CHANGED message payload                             │
│          ↓                                                      │
│  React: GeneratorEditor receives Generator                      │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    WRITING (React → Extension)                  │
├────────────────────────────────────────────────────────────────┤
│  React: GeneratorEditor creates Generator instance              │
│          ↓                                                      │
│  ELEMENT_UPDATE message payload                                │
│          ↓                                                      │
│  Extension: Generator instance                                  │
│          ↓                                                      │
│  ModelManager.saveElementData()                                 │
│          ↓                                                      │
│  StorageAdapter.updateElementData()                             │
│          ↓                                                      │
│  BlockProxy.customData (stored as JSON)                         │
└────────────────────────────────────────────────────────────────┘
```

### Key Transformations

1. **Duration Object Handling** (GeneratorLucid:81-93)
   - Stored as plain objects: `{ durationPeriodUnit, distribution }`
   - Reconstructed to Duration instances on read
   - `new Duration(periodUnit, distribution)`
   - Both periodIntervalDuration and periodicStartDuration

2. **Entity Reference** (GeneratorEditor:208-219)
   - Stores entity ID string, not full Entity object
   - Dropdown populated from referenceData.entities
   - User selects which entity template this generator creates

3. **Infinity Handling** (Generator.ts:46, 50)
   - `periodicOccurrences = Infinity`: Create entities indefinitely
   - `maxEntities = Infinity`: No total entity limit
   - Displayed as 999999 in UI for user editing

4. **State Modifications** (GeneratorLucid:99-104)
   - Stored as JSON arrays like Activity
   - Deserialized to StateModification instances
   - Applied to created entities as initial state values

5. **EnhancedDurationEditor Integration** (GeneratorEditor:44-84)
   - Special handleDurationChange method
   - Creates new Generator instance with updated Duration
   - Triggers immediate save (different from text input fields)

---

## Phase 1: Selection (Extension → React)

### User Clicks Generator Shape

1. **LucidChart SDK triggers selection callback**
   - Viewport.hookSelection registered in extension startup
   - Called with selected ItemProxy[]

2. **SelectionHandler processes the selection**
   - File: `src/core/messaging/handlers/selection/SelectionHandler.ts:77-149`
   - `handleLucidSelectionEvent()` extracts shape data
   - Determines selection type (Generator)
   - Gets appropriate processor from ProcessorFactory

3. **Generator data extracted from shape**
   - Processor reads shape's custom data (stored as JSON)
   - Reads q_data field with generator properties
   - Builds Generator data structure using GeneratorLucid
   - Reconstructs Duration objects from stored data

4. **SELECTION_CHANGED message created**
   - File: `src/core/messaging/handlers/selection/SelectionHandler.ts:144`
   - Message includes:
     - `elementId`: Shape ID
     - `type`: "Generator"
     - `data`: All Generator properties including Duration objects
     - `metadata`: Simulation object type, version
     - `referenceData`: Available entities, activities for dropdowns

5. **Message sent to React panels**
   - File: `src/core/messaging/MessageRouter.ts`
   - `router.send('model', message)` broadcasts to model panel

### Console Output
```
[SelectionHandler] Handling selection change { itemCount: 1, items: ['gen456'] }
[SelectionHandler] Selection type determined: Generator
[GeneratorLucid] Creating Generator from BlockProxy
[GeneratorLucid] Reconstructing Duration objects from storage
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
   - Passes currentElement and referenceData to ElementEditor

### ElementEditor Routes to GeneratorEditor

5. **ElementEditor determines editor type**
   - File: `quodsim-react/src/features/modelPanel/ElementEditor.tsx:143-154`
   - Switch case on element type
   - For `SimulationObjectType.Generator`: renders GeneratorEditor

```typescript
case SimulationObjectType.Generator:
case "Generator":
  return (
    <GeneratorEditor
      generator={safeElementData}
      onSave={onSave}
      onCancel={handleCancel}
      referenceData={referenceData}
      states={states}
      onStatesChange={onStatesChange}
    />
  );
```

### GeneratorEditor Displays Form

6. **GeneratorEditor validates and prepares**
   - File: `quodsim-react/src/features/editors/GeneratorEditor.tsx:29-42`
   - Validates generator has ID
   - Extracts entities from referenceData for dropdown
   - Passes generator directly to BaseEditor

7. **BaseEditor wraps with form handling**
   - File: `quodsim-react/src/features/editors/BaseEditor.tsx:24-62`
   - Manages localGenerator state
   - Provides handleChange function
   - Provides Save/Cancel buttons

8. **User sees the Generator editor**
   - File: `quodsim-react/src/features/editors/GeneratorEditor.tsx:120-363`
   - Tabbed interface: Basic, Frequency, Start, States
   - Frequency tab shows:
     - Interarrival Time: EnhancedDurationEditor displays "1 Hour"
     - Periodic Occurrences input
   - Basic tab shows:
     - Generator name input
     - Entity template dropdown
     - Entities per creation, max entities

### Console Output
```
[MessageProvider] Received SELECTION_CHANGED
[useModelPanel] ModelItemData details: { id: 'gen456', name: 'Arrivals', type: 'Generator' }
[ElementEditor] Rendering GeneratorEditor for type: Generator
[GeneratorEditor] Entities available: 3
[BaseEditor] useEffect - new data: { id: 'gen456', name: 'Arrivals', ... }
```

---

## Phase 3: User Edit (Local State)

### User Edits Interarrival Time

1. **User switches to Frequency tab**
   - File: `quodsim-react/src/features/editors/GeneratorEditor.tsx:136-146`
   - Tab button clicked
   - activeTab state changes to "frequency"

2. **EnhancedDurationEditor displayed**
   - File: `quodsim-react/src/features/editors/GeneratorEditor.tsx:273-297`
   - Shows current interarrival time: "1 Hour"
   - User changes period unit to "MINUTES"
   - User changes value to "30"

```typescript
<EnhancedDurationEditor
  periodUnit={localGenerator.periodIntervalDuration.durationPeriodUnit}
  distribution={localGenerator.periodIntervalDuration.distribution}
  onChange={(periodUnit, distribution) =>
    handleDurationChange(
      "periodIntervalDuration",
      periodUnit,
      distribution
    )
  }
  compact={true}
/>
```

3. **handleDurationChange triggers immediate save**
   - File: `quodsim-react/src/features/editors/GeneratorEditor.tsx:44-84`
   - **Important**: Unlike text inputs, Duration changes trigger immediate save
   - Creates new Generator instance with updated Duration
   - Calls onSave immediately

```typescript
const handleDurationChange = (
  name: "periodIntervalDuration" | "periodicStartDuration",
  periodUnit: PeriodUnit,
  distribution: Distribution
) => {
  const updatedGenerator = new Generator(
    generator.id,
    generator.name,
    generator.activityKeyId,
    generator.entityId,
    generator.periodicOccurrences,
    {
      ...generator.periodIntervalDuration,
      ...(name === "periodIntervalDuration"
        ? {
            durationPeriodUnit: periodUnit,  // MINUTES
            distribution,  // Constant(30)
          }
        : {}),
    },
    generator.entitiesPerCreation,
    // ... other properties
  );

  onSave(updatedGenerator);  // Immediate save
};
```

4. **Data transformation**
   - Before: `periodIntervalDuration = Duration(HOURS, Constant(1))`
   - After: `periodIntervalDuration = Duration(MINUTES, Constant(30))`
   - **Message sent immediately** - different from text input pattern

### Console Output
```
[GeneratorEditor] Duration change: periodIntervalDuration
[GeneratorEditor] Creating new Generator with updated Duration
[GeneratorEditor] Calling onSave with updated generator
```

---

## Phase 4: Save Trigger (React → Extension)

### Duration Change Triggers Save

1. **GeneratorEditor.handleDurationChange calls onSave**
   - File: `quodsim-react/src/features/editors/GeneratorEditor.tsx:83`
   - **No BaseEditor.handleSave** - bypassed for Duration edits
   - Goes directly to parent onSave callback

2. **BaseEditor.onSave creates Generator instance**
   - File: `quodsim-react/src/features/editors/GeneratorEditor.tsx:97-114`
   - Creates new Generator instance to preserve class methods
   - Ensures all properties properly typed

```typescript
onSave={(updatedData) => {
  const updatedGenerator = new Generator(
    updatedData.id,
    updatedData.name,
    updatedData.activityKeyId,
    updatedData.entityId,
    updatedData.periodicOccurrences,
    updatedData.periodIntervalDuration,  // Updated Duration object
    updatedData.entitiesPerCreation,
    updatedData.periodicStartDuration,
    updatedData.maxEntities,
    updatedData.x,
    updatedData.y
  );

  onSave(updatedGenerator);
}}
```

3. **Callback chain bubbles up**
   - GeneratorEditor's onSave → ElementEditor's onSave
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
    elementId: "gen456",
    type: "Generator",
    data: {
      id: "gen456",
      name: "Arrivals",
      activityKeyId: "",
      entityId: "entity-123",
      periodicOccurrences: Infinity,
      periodIntervalDuration: {  // Updated Duration
        durationPeriodUnit: "MINUTES",
        distribution: {
          distributionType: "constant",
          parameters: { value: 30 }
        }
      },
      entitiesPerCreation: 1,
      periodicStartDuration: {
        durationPeriodUnit: "HOURS",
        distribution: {
          distributionType: "constant",
          parameters: { value: 1 }
        }
      },
      maxEntities: Infinity,
      initialStateModifications: [],
      x: 300,
      y: 200
    }
  }
}
```

**Note:** Duration objects serialized as plain objects with durationPeriodUnit and distribution.

### Console Output
```
[useModelPanel] Updating element gen456 with data: { periodIntervalDuration: {...}, ... }
[modelOpsSender] updateElementData called with elementId: gen456, type: Generator
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
   - Extracts elementId, type ("Generator"), data
   - Gets ModelManager and EditorClient singletons
   - Gets current page from viewport

5. **findElementById locates shape**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:290-299`
   - Searches page.allBlocks for elementId
   - Returns BlockProxy

6. **getElementType converts string to enum**
   - File: `src/core/messaging/handlers/elementOpsHandler.ts:307-335`
   - Handles "Generator" string → SimulationObjectType.Generator

### Data Persistence

7. **ModelManager.saveElementData persists to LucidChart**
   - File: `src/core/ModelManager.ts`
   - Creates or updates Generator instance in ModelDefinition
   - Calls StorageAdapter to write to shape

8. **StorageAdapter writes to shape custom data**
   - File: `src/core/StorageAdapter.ts`
   - Serializes Generator to JSON
   - Stores in shape's custom data field
   - Updates q_meta field with type information

9. **GeneratorLucid performs the write**
   - File: `src/types/GeneratorLucid.ts:131-172`
   - `updateFromPlatform()` called
   - Syncs position from current block location
   - Serializes Duration objects to plain objects

```typescript
// GeneratorLucid.updateFromPlatform()
const dataToStore = {
  id: generator.id,
  name: generator.name,
  activityKeyId: generator.activityKeyId,
  entityId: generator.entityId,
  periodicOccurrences: generator.periodicOccurrences,
  periodIntervalDuration: {  // Duration → plain object
    durationPeriodUnit: generator.periodIntervalDuration.durationPeriodUnit,  // "MINUTES"
    distribution: generator.periodIntervalDuration.distribution  // Constant(30)
  },
  entitiesPerCreation: generator.entitiesPerCreation,
  periodicStartDuration: {
    durationPeriodUnit: generator.periodicStartDuration.durationPeriodUnit,
    distribution: generator.periodicStartDuration.distribution
  },
  maxEntities: generator.maxEntities,
  initialStateModifications: generator.initialStateModifications.map(m => m.toJSON()),
  x: generator.x,
  y: generator.y
};

storageAdapter.updateElementData(element, dataToStore);
```

10. **Model validation triggered**
    - File: `src/core/ModelManager.ts:validateModel()`
    - ModelValidationService checks entire model
    - Validates generator has entity reference
    - Checks Duration objects valid
    - Validation results cached

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
[ElementOpsHandler] Element update requested { elementId: 'gen456', type: 'Generator' }
[ElementOpsHandler] Element found: BlockProxy
[ModelManager] saveElementData - elementId: gen456, type: Generator
[StorageAdapter] Writing element data to shape gen456
[GeneratorLucid] Updating Generator from platform
[GeneratorLucid] Serializing Duration objects to storage
[GeneratorLucid] Storing updated data: { periodIntervalDuration: {...}, ... }
[ModelManager] Model validation triggered
[ModelValidationService] Validating generator entity reference
[ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: 'gen456' }
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

4. **UI responds to update**
   - EnhancedDurationEditor already shows new value
   - Success notification may appear (if implemented)

5. **Optional: Selection refresh**
   - Extension may re-select the element
   - Triggers new SELECTION_CHANGED message
   - React receives updated Generator data
   - Confirms interarrival time change persisted: "30 Minutes"

### Console Output
```
[MessageProvider] Received ELEMENT_UPDATE_RESULT
[mapElementOps] Element update succeeded: { elementId: 'gen456' }
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTION                               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                1. User clicks Generator shape
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: SELECTION (Extension → React)               │
├─────────────────────────────────────────────────────────────────────────┤
│  Viewport.hookSelection → SelectionHandler → Processor                 │
│  Extract Generator data → Reconstruct Duration objects                 │
│  Create SELECTION_CHANGED message                                      │
│  MessageRouter.send('model', message)                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: UI DISPLAY (React)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  MessageProvider → mapSelection → selectionSlice                        │
│  ModelPanel → ElementEditor → GeneratorEditor → BaseEditor              │
│  Display interarrival time: "1 Hour"                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                2. User changes to "30 Minutes"
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: USER EDIT (Immediate Save)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  EnhancedDurationEditor.onChange → handleDurationChange                 │
│  Create new Generator with updated Duration                             │
│  onSave(updatedGenerator) - IMMEDIATE                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 PHASE 4: SAVE TRIGGER (React → Extension)               │
├─────────────────────────────────────────────────────────────────────────┤
│  GeneratorEditor.onSave → ElementEditor.onSave                          │
│  → useModelPanel.onElementUpdate                                        │
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
│  → GeneratorLucid serializes Duration objects                           │
│  → Write to shape custom data → Validate model                          │
│  → Create ELEMENT_UPDATE_RESULT → MessageRouter.send                    │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│               PHASE 6: SUCCESS RESPONSE (Extension → React)             │
├─────────────────────────────────────────────────────────────────────────┤
│  MessageProvider → mapElementOps → Update state                         │
│  Show success notification                                              │
│  Optional: Selection refresh with updated data                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Code Touchpoints Summary

| Phase | Component | File Path | Lines | Action |
|-------|-----------|-----------|-------|--------|
| Types | Generator | `shared/src/types/elements/Generator.ts` | 10-58 | Core Generator class definition |
| Types | GeneratorLucid | `editorextensions/quodsi_editor_extension/src/types/GeneratorLucid.ts` | 55-247 | Lucid platform bridge |
| 1 | SelectionHandler | `src/core/messaging/handlers/selection/SelectionHandler.ts` | 77-149 | Process selection, send SELECTION_CHANGED |
| 1 | GeneratorLucid | `editorextensions/quodsi_editor_extension/src/types/GeneratorLucid.ts` | 68-110 | Read Generator from BlockProxy |
| 2 | MessageProvider | `quodsim-react/src/messaging/MessageProvider.tsx` | - | Receive postMessage |
| 2 | mapSelection | `quodsim-react/src/messaging/mappers/selection.mapper.ts` | - | Convert to Redux action |
| 2 | ElementEditor | `quodsim-react/src/features/modelPanel/ElementEditor.tsx` | 143-154 | Route to GeneratorEditor |
| 2 | GeneratorEditor | `quodsim-react/src/features/editors/GeneratorEditor.tsx` | 29-42 | Validate and display Generator |
| 2 | Generator | `shared/src/types/elements/Generator.ts` | 41-57 | Generator constructor used |
| 2 | BaseEditor | `quodsim-react/src/features/editors/BaseEditor.tsx` | 24-62 | Manage form state |
| 3 | GeneratorEditor | `quodsim-react/src/features/editors/GeneratorEditor.tsx` | 273-297 | EnhancedDurationEditor for interarrival |
| 3 | GeneratorEditor | `quodsim-react/src/features/editors/GeneratorEditor.tsx` | 44-84 | handleDurationChange - immediate save |
| 4 | GeneratorEditor | `quodsim-react/src/features/editors/GeneratorEditor.tsx` | 97-114 | Create Generator instance in onSave |
| 4 | Generator | `shared/src/types/elements/Generator.ts` | 41-57 | Generator constructor creates instance |
| 4 | useModelPanel | `quodsim-react/src/messaging/hooks/useModelPanel.ts` | 149-162 | Trigger update |
| 4 | modelOpsSender | `quodsim-react/src/messaging/senders/modelOpsSender.ts` | 79-93 | Create ELEMENT_UPDATE |
| 5 | RightDockPanel | `src/managers/PanelManager.ts` | - | Receive postMessage |
| 5 | MessageRouter | `src/core/messaging/MessageRouter.ts` | - | Route to handler |
| 5 | ElementOpsHandler | `src/core/messaging/handlers/elementOpsHandler.ts` | 49-138 | Process update |
| 5 | ModelManager | `src/core/ModelManager.ts` | - | Save element data |
| 5 | StorageAdapter | `src/core/StorageAdapter.ts` | - | Write to shape |
| 5 | GeneratorLucid | `editorextensions/quodsi_editor_extension/src/types/GeneratorLucid.ts` | 131-172 | Serialize Generator to storage |
| 6 | MessageProvider | `quodsim-react/src/messaging/MessageProvider.tsx` | - | Receive result |
| 6 | mapElementOps | `quodsim-react/src/messaging/mappers/elementOps.mapper.ts` | - | Process result |

---

## Complete Console Output Example

This shows the full console output for the complete flow:

```
[SelectionHandler] Handling selection change { itemCount: 1, items: ['gen456'] }
[SelectionHandler] Selection type determined: Generator
[ProcessorFactory] Creating processor for Generator
[GeneratorProcessor] Extracting Generator data from shape gen456
[GeneratorLucid] Creating Generator from BlockProxy
[GeneratorLucid] Reconstructing Duration objects from storage
[StorageAdapter] Reading generator data: periodIntervalDuration, periodicStartDuration
[MessageRouter] Sending SELECTION_CHANGED to model-iframe

[MessageProvider] Received message: SELECTION_CHANGED
[selectionSlice] Updating selection state
[useModelPanel] ModelItemData details: { id: 'gen456', name: 'Arrivals', type: 'Generator' }
[useModelPanel] Reference data entities: 3
[ElementEditor] Rendering GeneratorEditor for type: Generator
[GeneratorEditor] Entities available for dropdown: 3
[BaseEditor] useEffect - new data: { id: 'gen456', name: 'Arrivals', ... }

[GeneratorEditor] User editing interarrival time via EnhancedDurationEditor
[GeneratorEditor] Duration change detected: periodIntervalDuration
[GeneratorEditor] Creating new Generator with updated Duration: MINUTES, Constant(30)
[GeneratorEditor] Calling onSave immediately (no Save button click needed)
[useModelPanel] Updating element gen456 with data: { periodIntervalDuration: {...}, ... }
[modelOpsSender] updateElementData called with elementId: gen456, type: Generator
[useSender] Sending ELEMENT_UPDATE to host

[RightDockPanel] Received message from iframe: ELEMENT_UPDATE
[MessageRouter] Routing ELEMENT_UPDATE to ElementOpsHandler
[ElementOpsHandler] Element update requested { elementId: 'gen456', type: 'Generator' }
[ElementOpsHandler] Element found: BlockProxy
[ModelManager] saveElementData - elementId: gen456, type: Generator
[StorageAdapter] Writing element data to shape gen456
[GeneratorLucid] Updating Generator from platform
[GeneratorLucid] Serializing Duration objects to plain objects
[GeneratorLucid] Storing updated data: { periodIntervalDuration: { durationPeriodUnit: 'MINUTES', ... }, ... }
[ModelManager] Model validation triggered
[ModelValidationService] Validating generator: entity reference exists, durations valid
[ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: 'gen456' }

[MessageProvider] Received message: ELEMENT_UPDATE_RESULT
[mapElementOps] Element update succeeded: { elementId: 'gen456' }
```

---

## Unique Characteristics of Generator Updates

### 1. Immediate Save on Duration Changes

**Unlike other editors:**
- Text inputs: User types → changes local state → clicks Save button
- Duration inputs: User changes duration → immediate save triggered

**Why:**
- EnhancedDurationEditor is a complex component
- Avoiding state synchronization complexity
- User expects immediate persistence for compound controls

**Code Pattern:**
```typescript
// GeneratorEditor.handleDurationChange
const handleDurationChange = (name, periodUnit, distribution) => {
  const updatedGenerator = new Generator(/* all properties */);
  onSave(updatedGenerator);  // Immediate save, no hasUnsavedChanges flag
};
```

### 2. Duration Object Serialization

**Reading (Extension → React):**
```typescript
// Stored as plain object
{
  durationPeriodUnit: "HOURS",
  distribution: { distributionType: "constant", parameters: { value: 1 } }
}

// Reconstructed to Duration instance
new Duration(
  storedData.periodIntervalDuration.durationPeriodUnit,
  storedData.periodIntervalDuration.distribution
)
```

**Writing (React → Extension):**
```typescript
// Generator instance has Duration objects
generator.periodIntervalDuration  // Duration instance

// Serialized to plain object for storage
{
  durationPeriodUnit: generator.periodIntervalDuration.durationPeriodUnit,
  distribution: generator.periodIntervalDuration.distribution
}
```

### 3. Entity Reference via Dropdown

**Not stored:**
- Full Entity object

**Stored:**
- Entity ID string (e.g., "entity-123")

**UI:**
- Dropdown populated from referenceData.entities
- User selects which entity template this generator creates
- Only the ID is stored in Generator.entityId

### 4. State Modifications for Created Entities

**Purpose:**
- Unlike Activity (state changes during processing)
- Generator sets initial state values for newly created entities

**Storage:**
- Serialized like Activity: `StateModification.toJSON()`
- Deserialized on read: `StateModification.fromJSON(data)`

---

## Comparison with Other Element Types

### Complexity Comparison

**Entity (Simplest):**
- 4 properties: id, name, x, y
- Single input field
- No nested objects

**Generator (Moderate):**
- 11 properties including 2 Duration objects
- 4 tabs: Basic, Frequency, Start, States
- Entity reference dropdown
- Duration objects with distributions
- Immediate save on duration changes

**Activity (Most Complex):**
- 10+ properties with arrays
- 5 tabs with complex nested editors
- Operation steps array with resource requirements
- Multiple transformation types

### Duration Handling Comparison

**Generator:**
- 2 Duration objects (periodIntervalDuration, periodicStartDuration)
- Both editable via EnhancedDurationEditor
- Immediate save pattern

**Activity:**
- Duration objects within operation steps array
- Each operation step has Duration for processing time
- Part of larger form, standard Save button pattern

**Model:**
- Duration-like fields (warmupClockPeriod, runClockPeriod)
- But stored as separate number + PeriodUnit
- Not true Duration objects

---

## Related Documentation

- [Element Update Exchange](./element-update.md) - General element update protocol
- [Entity Update Walkthrough](./entity-update-walkthrough.md) - Simplest element example
- [Activity Update Walkthrough](./activity-update-walkthrough.md) - Complex element example
- [Model Update Walkthrough](./model-update-walkthrough.md) - Page-level example
- [Selection Changed](../selection/selection-changed.md) - Selection message details
- [Message Protocol](../01_message_protocol.md) - Envelope structure
- [Message Lifecycle](../02_message_lifecycle.md) - General message flow patterns
