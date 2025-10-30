# Scenario 5: Extension Side (LucidChart Host) - Handling Save Message

**Context**: React sent ELEMENT_UPDATE message via postMessage. This document describes how the extension receives the message, persists data to LucidChart shapes, and sends confirmation back to React.

**Duration**: ~5-15ms

**Key Files**:
- `src/core/messaging/MessageRouter.ts` - Routes incoming messages
- `src/core/messaging/handlers/ElementOpsHandler.ts` - Handles element operations
- `src/core/ModelManager.ts` - Manages model state
- `src/core/StorageAdapter.ts` - Writes to LucidChart shapes
- `src/core/messaging/handlers/selection/SelectionHandler.ts` - Sends selection refresh

---

## Part A: Message Reception

### 1. MessageRouter receives postMessage
**Location**: `MessageRouter.ts` - window message listener

**Setup** (during extension initialization):
```typescript
window.addEventListener('message', (event: MessageEvent) => {
  const envelope = event.data as EnvelopeBase;

  // Validate message
  if (!envelope || !envelope.type) {
    return;
  }

  // Route to appropriate handler
  router.handleMessage(envelope);
});
```

**When ELEMENT_UPDATE arrives**:
- Validates envelope structure
- Checks `envelope.target === 'host'`
- Routes based on `envelope.type`

---

### 2. Router checks message type
**Location**: `MessageRouter.ts:handleMessage()`

**Purpose**: Route message to appropriate handler

**Logic**:
```typescript
public handleMessage(envelope: EnvelopeBase): void {
  switch (envelope.type) {
    case EnvelopeMessageType.ELEMENT_UPDATE:
      ElementOpsHandler.handleMessage(envelope);
      break;

    case EnvelopeMessageType.REACT_APP_READY:
      // Handle app ready
      break;

    case EnvelopeMessageType.SIMULATION_RUN:
      // Handle simulation
      break;

    // ... other message types

    default:
      console.warn('[MessageRouter] Unknown message type:', envelope.type);
  }
}
```

**For ELEMENT_UPDATE**: Routes to `ElementOpsHandler`

---

### 3. ElementOpsHandler.handleMessage() executes
**Location**: `handlers/ElementOpsHandler.ts:35-156`

**Purpose**: Process element update requests from React

**Code**:
```typescript
public static async handleMessage(msg: EnvelopeBase): Promise<void> {
  if (msg.type !== EnvelopeMessageType.ELEMENT_UPDATE) {
    return;
  }

  const { elementId, type, data, diagramElementType } = msg.data;

  console.log('[ElementOpsHandler] Received ELEMENT_UPDATE:', {
    elementId,
    type,
    diagramElementType,
    dataKeys: Object.keys(data)
  });

  try {
    await ElementOpsHandler.handleElementUpdate(
      elementId,
      type,
      data,
      diagramElementType
    );
  } catch (error) {
    console.error('[ElementOpsHandler] Error handling element update:', error);
    ElementOpsHandler.sendUpdateResult(elementId, false, error.message);
  }
}
```

**Extraction**:
- `elementId`: "activity_abc123"
- `type`: "Activity"
- `data`: Complete activity object with all changes
- `diagramElementType`: "BLOCK"

---

### 4. Get LucidChart item proxy
**Location**: `ElementOpsHandler.ts:handleElementUpdate()`

**Purpose**: Get reference to shape in diagram

**Code**:
```typescript
private static async handleElementUpdate(
  elementId: string,
  type: string,
  data: Record<string, any>,
  diagramElementType?: string
): Promise<void> {
  const client = ModelManager.getClient();

  // Get item from LucidChart
  const item = diagramElementType === 'LINE'
    ? await client.getLine(elementId)
    : await client.getBlock(elementId);

  if (!item) {
    throw new Error(`Element not found: ${elementId}`);
  }

  // Continue with update...
}
```

**LucidChart SDK calls**:
- `client.getBlock(elementId)` for blocks (activities, resources, etc.)
- `client.getLine(elementId)` for lines (connectors)

**Returns**: `ItemProxy` object representing the shape

---

### 5. Validate item exists
**Location**: Same function

**Error handling**:
```typescript
if (!item) {
  throw new Error(`Element not found: ${elementId}`);
}
```

**If item not found**:
- Throws error
- Caught in try/catch
- Sends ELEMENT_UPDATE_RESULT with success:false
- React displays error to user

**Why this might happen**:
- User deleted shape while editing
- Shape ID mismatch (rare)
- LucidChart API error

---

## Part B: Save Data to LucidChart

### 6. ModelManager.updateElementFromReact() called
**Location**: `ModelManager.ts:updateElementFromReact()`

**Purpose**: Central method for updating element data from React

**Code**:
```typescript
public async updateElementFromReact(
  item: ItemProxy,
  type: string,
  data: Record<string, any>
): Promise<void> {
  console.log('[ModelManager] Updating element from React:', {
    id: item.id,
    type,
    dataKeys: Object.keys(data)
  });

  // Validate type
  if (!this.isValidElementType(type)) {
    throw new Error(`Invalid element type: ${type}`);
  }

  // Use StorageAdapter to persist
  await this.storageAdapter.writeElementData(item, type, data);

  // Update ModelDefinition cache if this is a model page
  if (this.currentPage && this.isQuodsiModel(this.currentPage)) {
    // Rebuild ModelDefinition to reflect changes
    this.modelDefinition = null;  // Clear cache
    await this.buildModelDefinition(this.currentPage);
  }

  console.log('[ModelManager] Element updated successfully');
}
```

**Processing**:
1. Validates element type is supported
2. Calls StorageAdapter to write to shape
3. Clears ModelDefinition cache
4. Rebuilds ModelDefinition with fresh data

---

### 7. StorageAdapter writes to shape
**Location**: `StorageAdapter.ts:writeElementData()`

**Purpose**: Persist data to LucidChart shape's custom data fields

**Code**:
```typescript
public async writeElementData(
  item: ItemProxy,
  type: string,
  data: Record<string, any>
): Promise<void> {
  console.log('[StorageAdapter] Writing element data:', {
    id: item.id,
    type
  });

  // Prepare metadata
  const metadata: QuodsiMetadata = {
    type: type as SimulationObjectType,
    version: '1.0',
    lastModified: new Date().toISOString(),
    id: item.id
  };

  // Write to shape data fields
  item.shapeData.set('q_data', JSON.stringify(data));
  item.shapeData.set('q_meta', JSON.stringify(metadata));

  // Update timestamp
  item.shapeData.set('q_last_modified', metadata.lastModified);

  console.log('[StorageAdapter] Element data written successfully');
}
```

**LucidChart SDK operations**:
- `item.shapeData.set('q_data', JSON)` - Writes activity data
- `item.shapeData.set('q_meta', JSON)` - Writes metadata
- `item.shapeData.set('q_last_modified', timestamp)` - Updates timestamp

**Shape data fields**:
- `q_data`: Complete activity object (name, description, operation steps, etc.)
- `q_meta`: Metadata (type, version, lastModified, id)
- `q_last_modified`: ISO timestamp for quick access

---

### 8. LucidChart persists data
**Location**: LucidChart's internal systems (not our code)

**What happens**:
- LucidChart saves shape data changes to document
- Changes are added to undo/redo stack
- Document is marked as modified (needs saving)
- Data will persist when user saves document

**Performance**: ~2-5ms for LucidChart to process

**Important**: This is INSTANT from user's perspective. They don't need to save the document separately - shape data is immediately persisted to the diagram's in-memory state.

---

### 9. Update ModelDefinition in memory
**Location**: `ModelManager.ts:buildModelDefinition()`

**Purpose**: Ensure extension's in-memory model matches diagram

**Code**:
```typescript
public async buildModelDefinition(page: PageProxy): Promise<ModelDefinition> {
  console.log('[ModelManager] Building ModelDefinition for page:', page.id);

  // Clear existing cache
  this.modelDefinition = null;

  // Scan all shapes on page
  const allItems = await page.allBlocks();

  // Extract all Quodsi elements
  const activities: Activity[] = [];
  const resources: Resource[] = [];
  const entities: Entity[] = [];
  const connectors: Connector[] = [];

  for (const item of allItems) {
    const metadata = this.getMetadata(item);
    if (!metadata) continue;

    switch (metadata.type) {
      case SimulationObjectType.Activity:
        const activityData = this.storageAdapter.readElementData(item);
        activities.push(new Activity(activityData));
        break;

      case SimulationObjectType.Resource:
        const resourceData = this.storageAdapter.readElementData(item);
        resources.push(new Resource(resourceData));
        break;

      // ... other types
    }
  }

  // Create ModelDefinition
  this.modelDefinition = new ModelDefinition({
    activities,
    resources,
    entities,
    connectors,
    // ... other lists
  });

  return this.modelDefinition;
}
```

**Result**: ModelDefinition now contains the updated activity with new values

**Why rebuild?**: Ensures all reference data is fresh when we send SELECTION_CHANGED

---

## Part C: Trigger Selection Refresh

### 10. Get current selection
**Location**: `ElementOpsHandler.ts`

**Purpose**: Get currently selected items to refresh UI

**Code**:
```typescript
const client = ModelManager.getClient();
const selection = await client.getSelection();
```

**Returns**: Array of currently selected ItemProxy objects

**Why needed?**: We need to send fresh data back to React so it can update props with saved values.

---

### 11. Trigger SELECTION_CHANGED event
**Location**: `ElementOpsHandler.ts:135`

**Purpose**: Send fresh activity data back to React

**Code**:
```typescript
// Trigger selection refresh to update React with saved data
await SelectionHandler.handleLucidSelectionEvent(
  client,
  selection,
  ModelManager.getInstance()
);
```

**What this does**:
- Runs the ENTIRE selection processing flow (Scenario 1)
- ActivityProcessor reads the JUST-SAVED data from shape
- Builds fresh `modelItemData` with new values (name, duration = 7, etc.)
- Builds fresh `referenceData` (in case other things changed)
- Sends SELECTION_CHANGED message to React

**Key insight**: This is the SAME flow as initial selection, but now reading the saved data.

---

### 12. ActivityProcessor runs again
**Location**: `processors/ActivityProcessor.ts:process()`

**Purpose**: Build fresh activity data from saved shape

**What it reads**:
```typescript
// Reads from shape's q_data field
messageData.modelItemData = await itemDataBuilder.buildModelItemData(item);
```

**Now reads**:
- name: "Check In Patient" (saved value)
- operationSteps[0].duration.parameters.value: 7 (saved value)
- All other saved changes

**Important**: This is authoritative data from diagram, not React's local state.

---

### 13. Send SELECTION_CHANGED message to React
**Location**: `SelectionHandler.ts:sendSelectionChangedMessage()`

**Purpose**: Notify React that selection data has changed (with fresh saved values)

**Message sent**:
```typescript
{
  id: "selection_change_1705321250000",
  type: "SELECTION_CHANGED",
  source: "host",
  target: "model-iframe",
  version: "1.0",
  data: {
    selectedElements: [...],
    modelItemData: {
      id: "activity_abc123",
      data: {
        name: "Check In Patient",  // Fresh saved value!
        operationSteps: [
          {
            duration: {
              parameters: { value: 7 }  // Fresh saved value!
            }
          }
        ],
        // ... all saved data
      }
    },
    referenceData: {
      // Fresh reference data
    },
    documentContext: {...}
  }
}
```

**Timing**: Sent ~5-10ms after save started

**Why important**: React needs fresh props to sync with after save completes

---

## Part D: Send Save Success Response

### 14. Build ELEMENT_UPDATE_RESULT message
**Location**: `ElementOpsHandler.ts:sendUpdateResult()`

**Purpose**: Tell React the save succeeded

**Code**:
```typescript
private static sendUpdateResult(
  elementId: string,
  success: boolean,
  errorMessage?: string
): void {
  const envelope: EnvelopeBase = {
    id: `element_update_result_${Date.now()}`,
    type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
    source: 'host',
    target: 'model-iframe',
    version: '1.0',
    data: {
      success,
      elementId,
      errorMessage: errorMessage || undefined,
      message: success
        ? `${elementId} updated successfully`
        : `Failed to update ${elementId}: ${errorMessage}`
    }
  };

  MessageRouter.send('model', envelope);
}
```

**Success message**:
```typescript
{
  id: "element_update_result_1705321250005",
  type: "ELEMENT_UPDATE_RESULT",
  source: "host",
  target: "model-iframe",
  version: "1.0",
  data: {
    success: true,
    elementId: "activity_abc123",
    message: "activity_abc123 updated successfully"
  }
}
```

**Error message (if save failed)**:
```typescript
{
  success: false,
  elementId: "activity_abc123",
  errorMessage: "Failed to write to shape: permission denied",
  message: "Failed to update activity_abc123: permission denied"
}
```

---

### 15. Send via MessageRouter
**Location**: `MessageRouter.ts:send()`

**Purpose**: Route message to React iframe via postMessage

**Code**:
```typescript
public send(panelName: string, envelope: EnvelopeBase): void {
  const panel = this.panels.get(panelName);

  if (!panel || !panel.iframe) {
    console.error('[MessageRouter] Panel not found:', panelName);
    return;
  }

  // Send to iframe
  panel.iframe.contentWindow.postMessage(envelope, '*');

  console.log('[MessageRouter] Sent message to panel:', panelName, envelope.type);
}
```

**Result**: ELEMENT_UPDATE_RESULT message arrives at React

**Timing**: Sent ~5ms after save started (slightly after SELECTION_CHANGED)

---

## Message Timing

```
T=0:     React sends ELEMENT_UPDATE
T=1:     Extension receives message
T=2:     Get item proxy from LucidChart
T=3:     Write to shape data (StorageAdapter)
T=5:     LucidChart persists data
T=7:     Rebuild ModelDefinition
T=8:     Trigger SELECTION_CHANGED
T=9:       ActivityProcessor reads fresh data
T=10:      Send SELECTION_CHANGED to React
T=11:    Send ELEMENT_UPDATE_RESULT to React
T=12:    Extension done, waiting for next message
```

**Total duration**: ~10-15ms

**Two messages sent**:
1. SELECTION_CHANGED (~10ms) - Fresh activity data
2. ELEMENT_UPDATE_RESULT (~11ms) - Save success confirmation

**Order matters**: React processes both messages, but needs both to complete the save flow correctly.

---

## Error Handling

**If any error occurs**:
```typescript
try {
  await ElementOpsHandler.handleElementUpdate(...);
} catch (error) {
  console.error('[ElementOpsHandler] Error handling element update:', error);
  ElementOpsHandler.sendUpdateResult(elementId, false, error.message);
}
```

**Error scenarios**:
1. Element not found → `success: false, errorMessage: "Element not found"`
2. Invalid data → `success: false, errorMessage: "Validation failed"`
3. LucidChart API error → `success: false, errorMessage: "API error"`
4. Permission denied → `success: false, errorMessage: "Permission denied"`

**React receives error**:
- ELEMENT_UPDATE_RESULT with `success: false`
- Redux stores error in `saveErrors[elementId]`
- UI shows error message
- `isSaving` cleared, user can retry

---

## Performance Considerations

**Typical duration**: 5-15ms

**Breakdown**:
- postMessage deserialization: <1ms
- Get item proxy: 1-2ms
- Write to shape data: 1-2ms
- LucidChart persist: 2-5ms
- Rebuild ModelDefinition: 2-5ms
- Send SELECTION_CHANGED: 1-2ms
- Send ELEMENT_UPDATE_RESULT: <1ms

**Why fast?**:
- Direct shape data API (no network calls)
- Minimal processing (just JSON serialization)
- No complex validation (React already validated)
- Cached ModelManager references

**Bottlenecks**:
- ModelDefinition rebuild can be slow for large models (100+ shapes)
- Optimization: Only rebuild affected element, not entire model
- Future improvement opportunity

---

## Next Step

Extension has persisted data and sent two messages back to React:
1. SELECTION_CHANGED with fresh activity data
2. ELEMENT_UPDATE_RESULT with save success

React will now process these messages and complete the save flow.

**Continue to**: [06_react_save_response.md](./06_react_save_response.md) to see how React receives save confirmation and synchronizes props safely.
