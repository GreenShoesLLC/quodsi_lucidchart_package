# Scenario 1: Extension Side - User Selects Activity

**Context**: User clicks on an Activity shape in the LucidChart diagram. This document describes how the extension detects the selection, processes the activity data, and sends it to the React iframe.

**Duration**: ~5-10ms

**Key Files**:
- `src/extension.ts` - Main extension entry point
- `src/core/messaging/handlers/selection/SelectionHandler.ts` - Coordinates selection processing
- `src/core/messaging/handlers/selection/processors/ActivityProcessor.ts` - Activity-specific processing
- `src/core/messaging/handlers/selection/utils/selectionTypeUtils.ts` - Determines selection type
- `src/core/messaging/handlers/selection/utils/itemDataBuilder.ts` - Builds item data
- `src/core/messaging/handlers/selection/utils/referenceDataBuilder.ts` - Builds reference data
- `src/core/messaging/MessageRouter.ts` - Routes messages to React

---

## Step-by-Step Flow

### 1. User clicks Activity in diagram
**Location**: LucidChart UI (not our code)

- User clicks on an Activity shape (block) in the diagram
- LucidChart's internal event system detects the click
- LucidChart fires a selection change event
- Extension receives event via `EditorClient.registerAction` listener

**Registered in**: `extension.ts`
```typescript
client.registerAction('selectShape', async (client) => {
  const selection = client.getSelection();
  await SelectionHandler.handleLucidSelectionEvent(client, selection);
});
```

---

### 2. SelectionHandler.handleLucidSelectionEvent() called
**Location**: `SelectionHandler.ts:79-154`

**Purpose**: Central coordinator for all selection events

**Input**:
- `client`: EditorClient instance
- `items`: Array of selected ItemProxy objects (shapes/lines)
- `modelManager`: Optional (uses stored instance if not provided)

**Processing**:
```typescript
// Prevent concurrent processing
if (SelectionHandler.isHandlingSelectionChange) {
  console.log('[SelectionHandler] Already handling selection change, ignoring new event');
  return;
}

SelectionHandler.isHandlingSelectionChange = true;
```

- Sets `isHandlingSelectionChange = true` to prevent concurrent processing
- Gets current viewport and page via LucidChart SDK
- Gets document context (documentId, pageId, title)
- Validates current page exists

**Key code**:
```typescript
const viewport = new Viewport(client);
const currentPage = viewport.getCurrentPage();
const document = new DocumentProxy(client);
const documentId = document.id;

// Update document context
const isQuodsiModel = manager.isQuodsiModel(currentPage);
SelectionHandler.documentContext.update(
  documentId,
  currentPage.id,
  currentPage.getTitle?.() || document.getTitle() || 'Untitled',
  isQuodsiModel
);
```

---

### 3. selectionTypeUtils.determineSelectionType() determines type
**Location**: `utils/selectionTypeUtils.ts`

**Purpose**: Analyze selected items and determine what type of selection this is

**Input**: Array of ItemProxy objects

**Logic**:
```typescript
// Check for Quodsi metadata on items
for (const item of items) {
  const metadata = modelManager.getMetadata(item);
  if (metadata?.type === SimulationObjectType.Activity) {
    return SelectionType.ACTIVITY;
  }
  // ... checks for other types (Resource, Entity, Connector, etc.)
}

// If no metadata, check shape types
if (items.length === 1 && items[0].shapeData.get('shape') === 'rectangle') {
  return SelectionType.UNCONVERTED_BLOCK;
}
```

**Output**: `SelectionType.ACTIVITY` enum value

**Why this matters**: Different selection types use different processors (ActivityProcessor, ResourceProcessor, ConnectorProcessor, etc.)

---

### 4. ProcessorFactory.createProcessor() creates ActivityProcessor
**Location**: `processors/ProcessorFactory.ts`

**Purpose**: Factory pattern to get the appropriate processor for the selection type

**Input**: `SelectionType.ACTIVITY`

**Logic**:
```typescript
switch (selectionType) {
  case SelectionType.ACTIVITY:
    return new ActivityProcessor();
  case SelectionType.RESOURCE:
    return new ResourceProcessor();
  // ... other cases
  default:
    return new NoneSelectionProcessor();
}
```

**Output**: `ActivityProcessor` instance

---

### 5. ActivityProcessor.process() executes
**Location**: `processors/ActivityProcessor.ts:27-108`

**Purpose**: Extract activity-specific data and build complete message payload

**Input**:
- `client`: EditorClient
- `currentPage`: PageProxy
- `items`: Selected items (should be single activity)
- `selectionType`: ACTIVITY
- `modelManager`: ModelManager instance

**Processing**:

#### 5a. Create base message data
```typescript
const messageData = this.createBaseMessageData(
  items,
  currentPage,
  selectionType,
  documentId,
  isQuodsiModel
);
```

Includes: selectedElements, selectionCount, totalElementCount, documentId, etc.

#### 5b. Ensure ModelManager has current page
```typescript
modelManager.setCurrentPage(currentPage);
```

This is critical - ModelDefinition can only be built when ModelManager knows which page to read.

#### 5c. Get validation result
```typescript
const validationResult = await this.getValidationResult(modelManager);
messageData.validationResult = validationResult;
```

Includes validation warnings/errors for the entire model (not just this activity).

#### 5d. Build model item data
```typescript
messageData.modelItemData = await itemDataBuilder.buildModelItemData(
  item,
  modelManager
);
```

**What this does**:
- Reads shape's custom data fields (q_data, q_meta)
- Extracts: id, name, description, operationSteps, financialProperties
- Parses JSON strings into objects
- Returns structured `ModelItemData` object

**Example output**:
```typescript
{
  id: "activity_abc123",
  metadata: {
    type: SimulationObjectType.Activity,
    version: "1.0",
    lastModified: "2024-01-15T10:30:00Z"
  },
  data: {
    name: "Check In Patient",
    description: "Patient arrives and checks in",
    operationSteps: [
      {
        id: "step1",
        duration: { distributionType: "Constant", parameters: { value: 5 } },
        resourceRequirements: [...]
      }
    ],
    financialProperties: { cost: 100, revenue: 0 }
  }
}
```

#### 5e. Build reference data
```typescript
messageData.referenceData = await referenceDataBuilder.buildAllReferenceData(
  modelManager
);
```

**What this does**:
- Calls `ModelManager.buildModelDefinition()` to get entire model
- Extracts lists of ALL:
  - Activities
  - Resources
  - Entities
  - Connectors
  - States
  - Resource Requirements

**Example output**:
```typescript
{
  activities: [
    { id: "act1", name: "Check In" },
    { id: "act2", name: "Triage" },
    { id: "act3", name: "Treatment" }
  ],
  resources: [
    { id: "res1", name: "Nurse" },
    { id: "res2", name: "Doctor" }
  ],
  connectors: [
    { id: "conn1", sourceId: "act1", targetId: "act2", probability: 1.0 },
    { id: "conn2", sourceId: "act2", targetId: "act3", probability: 0.8 }
  ],
  // ... entities, states, requirements
}
```

**Why we send ALL reference data**: React components need dropdowns showing all activities, resources, etc. for configuring operation steps and routing.

#### 5f. ~~Filter outgoing connectors~~ (REMOVED in v2.0)
**Old code (before state cleanup)**:
```typescript
// Filter outgoing connectors for this activity
const activityId = item.id;
const allConnectors = messageData.referenceData?.connectors || [];
const outgoingConnectors = allConnectors.filter(conn => conn.sourceId === activityId);
messageData.outgoingConnectors = outgoingConnectors;
```

**v2.0 change**: Removed this filtering. Now React filters on-demand using `useMemo` in `useModelPanel.ts`.

#### 5g. Set diagram element type
```typescript
messageData.diagramElementType = this.getDiagramElementType(item);
```

Returns `DiagramElementType.BLOCK` (activities are blocks, connectors are lines).

#### 5h. Log processed data
```typescript
console.log('[ActivityProcessor] Processed activity data:', {
  id: item.id,
  hasModelData: messageData.modelItemData ? 'yes' : 'no',
  hasRefData: messageData.referenceData ? 'yes' : 'no',
  refDataSummary: {
    resources: messageData.referenceData.resources?.length || 0,
    resourceRequirements: messageData.referenceData.resourceRequirements?.length || 0,
    connectors: messageData.referenceData.connectors?.length || 0
  },
  diagramElementType: messageData.diagramElementType
});
```

**Output**: Complete `messageData` object with all activity and reference data

---

### 6. SelectionState.update() stores processed data
**Location**: `SelectionHandler.ts:143` → `state/SelectionState.ts:62-73`

**Purpose**: Store the processed data in SelectionHandler's internal state

**Input**: `messageData` (partial SelectionStateData)

**Processing**:
```typescript
public update(data: Partial<SelectionStateData>): void {
  this.state = {
    ...this.state,
    ...data
  };

  console.log('[SelectionState] Updated state:', {
    selectionType: this.state.selectionType,
    selectionCount: this.state.selectionCount,
    hasModel: this.state.hasModel
  });
}
```

**Why this matters**: This state is used when sending messages, and can be queried by other parts of the extension.

---

### 7. SelectionHandler.sendSelectionChangedMessage() sends to React
**Location**: `SelectionHandler.ts:174-265`

**Purpose**: Build final message envelope and send via postMessage to React iframe

**Processing**:

#### 7a. Get data from state managers
```typescript
const selectionData = SelectionHandler.selectionState.getData();
const documentData = SelectionHandler.documentContext.getData();
```

#### 7b. Build additional data if needed
If `modelItemData` or `referenceData` aren't in selectionData (shouldn't happen for Activity), build them:
```typescript
if (documentData.isQuodsiModel && !referenceData && SelectionHandler.modelManager) {
  referenceData = await referenceDataBuilder.buildAllReferenceData(
    SelectionHandler.modelManager
  );
}
```

#### 7c. Combine all data
```typescript
const messageData: any = {
  ...selectionData,                           // Selection info
  documentContext: documentData,              // Document context
  ...(modelItemData ? { modelItemData } : {}), // Activity data
  ...(referenceData ? { referenceData } : {})  // Reference data
};
```

#### 7d. Log message contents
```typescript
console.log('[SelectionHandler] Sending SELECTION_CHANGED message', {
  selectionType: messageData.selectionType,
  hasModel: messageData.hasModel,
  itemCount: messageData.selectionCount,
  hasReferenceData: !!messageData.referenceData,
  statesCount: messageData.referenceData?.states?.length || 0,
  requirementsCount: messageData.referenceData?.resourceRequirements?.length || 0,
  hasModelItemData: !!messageData.modelItemData,
  modelItemDataId: messageData.modelItemData?.id
});
```

#### 7e. Send via MessageRouter
```typescript
router.send('model', {
  id: `selection_change_${Date.now()}`,
  type: EnvelopeMessageType.SELECTION_CHANGED,
  source: 'host',
  target: 'model-iframe',
  version: '1.0',
  data: messageData
});
```

**What happens in router.send()**:
- Validates panel exists
- Validates message structure
- Calls `panel.iframe.contentWindow.postMessage(envelope, '*')`
- Message crosses iframe boundary

---

### 8. SelectionHandler cleanup
**Location**: `SelectionHandler.ts:152`

**Purpose**: Reset flag to allow next selection event

**Processing**:
```typescript
finally {
  SelectionHandler.isHandlingSelectionChange = false;
}
```

This happens even if an error occurred (in finally block), ensuring the extension doesn't get stuck.

---

## Message Format

The complete message sent to React looks like:

```typescript
{
  id: "selection_change_1705321234567",
  type: "SELECTION_CHANGED",
  source: "host",
  target: "model-iframe",
  version: "1.0",
  data: {
    // Selection info
    selectedElements: [
      {
        id: "activity_abc123",
        type: "Activity",
        // ... element shape data
      }
    ],
    selectionCount: 1,
    totalElementCount: 15,
    selectionType: "ACTIVITY",
    selectionState: {
      pageId: "page123",
      selectedIds: ["activity_abc123"],
      selectionType: "ACTIVITY"
    },
    documentId: "doc456",
    hasModel: true,

    // Document context
    documentContext: {
      documentId: "doc456",
      pageId: "page123",
      title: "Emergency Room Process",
      isQuodsiModel: true,
      metadata: {}
    },

    // Activity data
    modelItemData: {
      id: "activity_abc123",
      metadata: {
        type: "Activity",
        version: "1.0",
        lastModified: "2024-01-15T10:30:00Z"
      },
      data: {
        name: "Check In Patient",
        description: "Patient arrives and checks in",
        operationSteps: [...],
        financialProperties: {...}
      }
    },

    // Reference data (ALL activities, resources, etc.)
    referenceData: {
      activities: [{id: "act1", name: "Check In"}, ...],
      resources: [{id: "res1", name: "Nurse"}, ...],
      entities: [{id: "ent1", name: "Patient"}, ...],
      connectors: [{id: "conn1", sourceId: "act1", targetId: "act2"}, ...],
      states: [{id: "state1", name: "Waiting"}, ...],
      resourceRequirements: [...]
    },

    // Element specifics
    diagramElementType: "BLOCK",

    // Validation
    validationResult: {
      isValid: true,
      errors: [],
      warnings: []
    }
  }
}
```

---

## Performance Considerations

**Typical duration**: 5-10ms

**Performance costs**:
- LucidChart SDK calls (getSelection, getCurrentPage): ~1-2ms
- Reading shape data from diagram: ~1-2ms
- Building ModelDefinition (parsing all shapes): ~2-5ms
- Building reference data: ~1-2ms
- postMessage serialization: <1ms

**Optimization notes**:
- ModelDefinition is cached in ModelManager, only rebuilt when model changes
- Reference data reuses ModelDefinition, no duplicate reads
- Shape data is read once per selection change

---

## Error Handling

If any error occurs during processing:

```typescript
catch (error) {
  console.error('[SelectionHandler] Error handling selection event:', error);
  SelectionHandler.handleError(error instanceof Error ? error.message : String(error));
} finally {
  SelectionHandler.isHandlingSelectionChange = false;
}
```

**handleError()** creates an error message and sends it to React:
```typescript
private static handleError(message: string, details?: any): void {
  // Set error in selection state
  SelectionHandler.selectionState.setError(message, details);

  // Send error message to React
  SelectionHandler.sendSelectionChangedMessage();
}
```

React will receive SELECTION_CHANGED with an error field and can display it to the user.

---

## Next Step

Once the message is sent via postMessage, control passes to the React iframe.

**Continue to**: [02_react_receive_and_display.md](./02_react_receive_and_display.md) to see how React receives and processes this message.
