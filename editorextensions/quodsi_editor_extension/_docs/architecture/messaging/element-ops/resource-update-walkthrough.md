# Resource Update Walkthrough

**Concrete Example:** Step-by-step walkthrough of updating a Resource's capacity from 1 to 3 units, showing financial properties handling and state management.

**Element Type:** Resource (simulation resource pool)
**Storage:** BlockProxy (individual shape element)
**Complexity:** Low-Moderate (5 properties + financial object, 3-tab UI, straightforward)

## Type System and Data Transformations

### Core Resource Class
**File:** `@shared/src/types/elements/Resource.ts`

```typescript
class Resource extends PositionedSimulationObject {
  type: SimulationObjectType = SimulationObjectType.Resource;
  financialProperties?: ResourceFinancialProperties;

  constructor(
    public id: string,
    public name: string,
    public capacity: number = 1,
    x: number = 0,
    y: number = 0
  )
}
```

**Properties:**
- `id` - Unique identifier (from LucidChart block ID)
- `name` - Resource name
- `capacity` - Maximum concurrent uses (default: 1)
- `financialProperties` - Optional cost tracking object
- `x, y` - Position (inherited from PositionedSimulationObject)

### ResourceLucid Bridge
**File:** `@editorextensions/quodsi_editor_extension/src/types/ResourceLucid.ts`

Maps LucidChart BlockProxy ↔ Resource class:

```typescript
interface StoredResourceData {
  id: string;
  x?: number;
  y?: number;
  name?: string;
  capacity?: number;
  financialProperties?: any;  // Serialized ResourceFinancialProperties
}
```

**Data Flow - Reading from Storage:**
```
BlockProxy.shapeData → StoredResourceData → Resource instance
  ↓
1. getElementData() reads JSON
2. Extract capacity, name, etc.
3. Deserialize financialProperties via fromJSON()
4. Create Resource instance
5. Update location from BlockProxy.getLocation()
```

**Data Flow - Writing to Storage:**
```
Resource instance → StoredResourceData → BlockProxy.shapeData
  ↓
1. Extract capacity, name, x, y
2. Serialize financialProperties via toJSON()
3. Build StoredResourceData object
4. updateElementData() writes JSON
```

### Key Data Transformations

#### 1. Financial Properties Serialization
```typescript
// Reading
resource.financialProperties = ResourceFinancialProperties.fromJSON(
  storedData.financialProperties
);

// Writing
dataToStore.financialProperties = resource.financialProperties?.toJSON();
```

#### 2. Financial Properties Update
ResourceEditor creates new instance to update individual fields:
```typescript
const updatedFinancial = new ResourceFinancialProperties({
  enabled: currentFinancial.enabled,
  costPerSeize: currentFinancial.costPerSeize,
  costPerHourUtilized: currentFinancial.costPerHourUtilized,
  costPerHourIdle: currentFinancial.costPerHourIdle,
  [field]: newValue  // Single field override
});
```

## Complete Update Flow

### Phase 1: Selection (Extension → React)

**Extension Side:**
```typescript
// SelectionHandler detects Resource block selection
const resourceLucid = new ResourceLucid(block, storageAdapter);
const resource = resourceLucid.simObject;

// Send to React
messageRouter.sendToPanel(PANEL_NAMES.MODEL_PANEL, {
  type: 'SELECTION_CHANGED',
  data: {
    selectedElement: resource,  // Full Resource instance
    selectionType: SelectionType.SINGLE_ELEMENT
  }
});
```

**Console Output:**
```
[SelectionHandler] Selection changed, count: 1
[ResourceLucid] Creating Resource simulation object for element: res_123
[MessageRouter] Sending SELECTION_CHANGED to modelPanel
```

**React Side:**
```typescript
// selectionSlice reducer
case 'SELECTION_CHANGED':
  state.selectedElement = action.payload.selectedElement;
  state.selectionType = SelectionType.SINGLE_ELEMENT;
  // Triggers ResourceEditor to mount with resource prop
```

### Phase 2: UI Display (React)

**ResourceEditor.tsx receives props:**
```typescript
<ResourceEditor
  resource={selectedElement}  // Resource instance from selection
  onSave={handleSave}
  onCancel={handleCancel}
  states={stateListManager}
  onStatesChange={handleStatesChange}
/>
```

**Initial data extraction:**
```typescript
const extractResourceData = (res: any): Resource => {
  const data = res.data || res;
  const resource = new Resource(
    data.id || "",
    data.name || "New Resource",
    data.capacity || 1,
    data.x || 0,
    data.y || 0
  );

  // Initialize financialProperties if doesn't exist
  resource.financialProperties = data.financialProperties
    ? ResourceFinancialProperties.fromJSON(data.financialProperties)
    : new ResourceFinancialProperties();

  return resource;
};
```

**ResourceEditor manages state directly:**
```typescript
const [formData, setFormData] = useState<Resource>(() => extractResourceData(resource));
const [hasChanges, setHasChanges] = useState(false);
const [isSaving, setIsSaving] = useState(false);

// Sync with prop changes
useEffect(() => {
  if (!hasChanges && !isSaving) {
    setFormData(extractResourceData(resource));
  }
}, [resource, hasChanges, isSaving]);

// Render form with direct state
<div className="space-y-2">
  {activeTab === "basic" && (
    <input
      type="number"
      name="capacity"
      value={formData.capacity}  // Current value: 1
      onChange={handleChange}
    />
  )}
</div>
```

### Phase 3: User Edit (Local State)

User changes capacity from 1 to 3:

```typescript
// User types "3" in capacity input
const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: name === 'capacity' ? parseInt(value, 10) : value,
  }));
  setHasChanges(true);  // Enable Save button
};
```

**Local state now:**
```typescript
formData = {
  id: "res_123",
  name: "Server Pool",
  capacity: 3,  // Changed from 1
  x: 150,
  y: 200,
  financialProperties: ResourceFinancialProperties { ... }
}
hasChanges = true
```

### Phase 4: Save Click (React → Extension)

User clicks Save button:

```typescript
// ResourceEditor handleSave
const handleSave = () => {
  setIsSaving(true);

  // Create new Resource instance to preserve class methods
  const resourceToSave = new Resource(
    formData.id,
    localData.name,
    localData.capacity,  // 3
    localData.x,
    localData.y
  );

  // Preserve financialProperties
  updatedResource.financialProperties = localData.financialProperties;

  onSave(updatedResource);  // Call parent's onSave
};

// ResourceEditor's onSave sends message
modelOpsSender.updateElement({
  elementId: updatedResource.id,
  type: SimulationObjectType.Resource,
  data: updatedResource  // Full Resource instance
});
```

**Message sent to extension:**
```typescript
{
  id: "msg_789",
  type: "ELEMENT_UPDATE",
  source: "modelPanel",
  target: "extension",
  version: "1.0.0",
  data: {
    elementId: "res_123",
    type: "Resource",
    data: {
      id: "res_123",
      name: "Server Pool",
      capacity: 3,  // Updated value
      x: 150,
      y: 200,
      financialProperties: { enabled: false, ... }
    }
  }
}
```

**Console Output:**
```
[modelOpsSender] Sending ELEMENT_UPDATE for res_123
[MessageProvider] Posting message to extension
```

### Phase 5: Extension Processing

**ElementOpsHandler receives message:**
```typescript
async handleElementUpdate(payload: ElementUpdatePayload) {
  const { elementId, type, data } = payload;

  // Find the block
  const block = await editorClient.getBlockProxy(elementId);

  // Reconstruct Resource instance
  const resource = new Resource(
    data.id,
    data.name,
    data.capacity,  // 3
    data.x,
    data.y
  );

  // Deserialize financial properties from plain object
  if (data.financialProperties) {
    resource.financialProperties = ResourceFinancialProperties.fromJSON(
      data.financialProperties
    );
  }

  // Update storage via ResourceLucid
  const resourceLucid = new ResourceLucid(block, storageAdapter);
  resourceLucid.simObject = resource;
  resourceLucid.updateFromPlatform();  // Writes to shapeData
}
```

**ResourceLucid.updateFromPlatform():**
```typescript
public updateFromPlatform(): void {
  // Extract location from platform
  const location = (this.element as BlockProxy).getLocation();

  // Update location
  this.simObject.setLocation(location.x ?? this.simObject.x, location.y ?? this.simObject.y);

  // Build data to store
  const dataToStore: StoredResourceData = {
    id: this.platformElementId,
    x: this.simObject.x,
    y: this.simObject.y,
    name: this.simObject.name,
    capacity: this.simObject.capacity,  // 3 (new value)
    financialProperties: this.simObject.financialProperties?.toJSON()
  };

  // Write to LucidChart storage
  this.storageAdapter.updateElementData(this.element, dataToStore);
}
```

**StorageAdapter writes to BlockProxy:**
```typescript
updateElementData(element: BlockProxy, data: StoredResourceData) {
  element.shapeData.set(CUSTOM_DATA_KEY, JSON.stringify(data));
}
```

**ModelManager validation:**
```typescript
// Rebuild model with updated resource
const modelDef = await modelManager.buildModelDefinition();

// Validate
const validation = modelValidationService.validate(modelDef);
```

**Console Output:**
```
[ElementOpsHandler] Handling ELEMENT_UPDATE for res_123
[ResourceLucid] Updating Resource from platform for res_123
[ResourceLucid] Storing updated data: { capacity: 3, ... }
[StorageAdapter] Updated element data for res_123
[ModelManager] Model rebuilt successfully
[ModelValidationService] Validation complete: 0 errors
```

### Phase 6: Success Response (Extension → React)

**Extension sends result:**
```typescript
messageRouter.sendToPanel(source, {
  type: 'ELEMENT_UPDATE_RESULT',
  data: {
    success: true,
    elementId: 'res_123'
  }
});
```

**React receives response:**
```typescript
// mapElementOps handles result
case 'ELEMENT_UPDATE_RESULT':
  if (payload.success) {
    // Clear unsaved changes flag
    setHasUnsavedChanges(false);

    // Show success message (ResourceEditor clears isSaving flag)
    console.log('Resource saved successfully');
  }
```

**Console Output:**
```
[MessageRouter] Sending ELEMENT_UPDATE_RESULT to modelPanel
[MessageProvider] Received ELEMENT_UPDATE_RESULT
[ResourceEditor] Save successful, clearing isSaving flag after delay
```

## Unique Characteristics of Resource Updates

### 1. Financial Properties Object
Unlike simpler elements, Resource has an optional financial properties object:

```typescript
// ResourceFinancialProperties structure
{
  enabled: boolean,
  costPerSeize: number,
  costPerHourUtilized: number,
  costPerHourIdle: number
}
```

Requires serialization/deserialization via `toJSON()`/`fromJSON()`.

### 2. Financial Change Handler
Special handler for updating individual financial fields:

```typescript
const handleFinancialChange = (field, value, localData, handleChange) => {
  const currentFinancial = localData.financialProperties || new ResourceFinancialProperties();

  // Create new instance with single field updated
  const updatedFinancial = new ResourceFinancialProperties({
    ...currentFinancial,
    [field]: value
  });

  // Trigger ResourceEditor's handleChange
  handleChange({
    target: {
      name: "financialProperties",
      value: updatedFinancial
    }
  } as any);
};
```

### 3. Three-Tab UI
Resource editor uses tabs for organization:
- **Basic:** Name and capacity
- **Finance:** Cost tracking (enabled checkbox + 3 cost fields)
- **States:** State management via StatesEditor

Similar to Activity and Generator, but simpler content.

### 4. Standard Save Pattern
Uses normal Save button flow (unlike Generator's immediate save for Durations):
- User edits → local state changes → `hasUnsavedChanges = true`
- User clicks Save → `ELEMENT_UPDATE` message → Extension processes

## Comparison with Other Element Types

### Complexity Spectrum:

**Entity (Simplest):**
- 4 properties (id, name, x, y)
- Single-tab UI
- No nested objects
- No transformations

**Resource (Low-Moderate):**
- 5 properties + financial object
- 3-tab UI (basic/finance/states)
- Optional nested object (financialProperties)
- Serialization for financial properties
- Standard save pattern

**Generator (Moderate):**
- 11 properties
- 2 Duration objects
- Immediate save pattern for durations
- Entity reference dropdown
- State modifications

**Model (Medium):**
- Page-level storage (PageProxy)
- Empty selection detection
- Time configuration (Clock/Calendar modes)
- Different selection pattern

**Activity (Most Complex):**
- 10+ properties
- Nested arrays (operation steps, resource requirements, state modifications)
- Complex transformations (buffer infinity, financial properties)
- Multiple nested editors

## Key Touchpoints

| # | Component | File | Line(s) | Action |
|---|-----------|------|---------|--------|
| 1 | **Resource Class** | `shared/src/types/elements/Resource.ts` | 5-39 | Core domain model, extends PositionedSimulationObject |
| 2 | **ResourceFinancialProperties** | `shared/src/types/elements/FinancialProperties.ts` | - | Financial tracking properties (enabled, costs) |
| 3 | **StoredResourceData** | `src/types/ResourceLucid.ts` | 24-31 | Interface for BlockProxy storage format |
| 4 | **ResourceLucid Constructor** | `src/types/ResourceLucid.ts` | 38-44 | Creates bridge between BlockProxy and Resource |
| 5 | **createSimObject** | `src/types/ResourceLucid.ts` | 50-74 | Reads storage, creates Resource instance |
| 6 | **Financial Deserialization** | `src/types/ResourceLucid.ts` | 66-68 | `fromJSON()` to deserialize financial properties |
| 7 | **updateFromPlatform** | `src/types/ResourceLucid.ts` | 95-124 | Writes Resource data to BlockProxy storage |
| 8 | **Financial Serialization** | `src/types/ResourceLucid.ts` | 119 | `toJSON()` to serialize financial properties |
| 9 | **SelectionHandler** | `src/core/messaging/handlers/selection/SelectionHandler.ts` | - | Detects Resource selection, creates ResourceLucid |
| 10 | **SELECTION_CHANGED Message** | `shared/src/quodsi-messaging/selection/messages.ts` | - | Message format for selection events |
| 11 | **selectionSlice Reducer** | `quodsim-react/src/messaging/state/selectionSlice.ts` | - | Stores selectedElement in Redux state |
| 12 | **ModelPanel** | `quodsim-react/src/features/modelPanel/ModelPanel.tsx` | - | Renders ResourceEditor when Resource selected |
| 13 | **ResourceEditor Component** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 23-319 | Main editor component with 3 tabs |
| 14 | **extractResourceData** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 27-43 | Extracts/normalizes Resource data, deserializes financial |
| 15 | **Tab Navigation** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 107-147 | 3 tabs: basic, finance, states |
| 16 | **Basic Tab** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 151-197 | Name and capacity inputs |
| 17 | **Finance Tab** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 200-302 | Financial tracking UI (enabled + 3 cost fields) |
| 18 | **handleFinancialChange** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 48-72 | Updates individual financial fields |
| 19 | **States Tab** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 305-311 | StatesEditor component for state management |
| 20 | **ResourceEditor State Management** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 75-130 | Manages form state with useState/useEffect hooks |
| 21 | **onSave Handler** | `quodsim-react/src/features/editors/ResourceEditor.tsx` | 87-100 | Creates new Resource instance, preserves financial |
| 22 | **modelOpsSender** | `quodsim-react/src/messaging/senders/modelOpsSender.ts` | - | Creates ELEMENT_UPDATE message |
| 23 | **MessageProvider** | `quodsim-react/src/messaging/MessageProvider.tsx` | - | Posts message to extension via postMessage |
| 24 | **MessageRouter** | `src/core/messaging/MessageRouter.ts` | - | Routes incoming ELEMENT_UPDATE to handler |
| 25 | **ElementOpsHandler** | `src/core/messaging/handlers/elementOpsHandler.ts` | - | Processes ELEMENT_UPDATE request |
| 26 | **getBlockProxy** | - | LucidChart SDK | - | Retrieves BlockProxy for element ID |
| 27 | **Resource Reconstruction** | `src/core/messaging/handlers/elementOpsHandler.ts` | - | Rebuilds Resource instance from message data |
| 28 | **Financial fromJSON** | `src/core/messaging/handlers/elementOpsHandler.ts` | - | Deserializes financial properties from plain object |
| 29 | **StorageAdapter** | `src/core/StorageAdapter.ts` | - | Writes JSON to BlockProxy.shapeData |
| 30 | **ModelManager** | `src/core/ModelManager.ts` | - | Rebuilds model, triggers validation |
| 31 | **ELEMENT_UPDATE_RESULT** | `shared/src/quodsi-messaging/elementOps/messages.ts` | - | Success/error response format |
| 32 | **mapElementOps** | `quodsim-react/src/messaging/mappers/elementOps.mapper.ts` | - | Handles ELEMENT_UPDATE_RESULT in React |

## Summary

Resource updates demonstrate **moderate complexity** with:
- Simple base properties (id, name, capacity)
- Optional financial properties object requiring serialization
- 3-tab UI for organization (basic/finance/states)
- Standard save pattern (no immediate saves)
- BlockProxy storage like other element types

**Key differences from simpler elements:**
- Financial properties add serialization complexity
- Multi-tab UI for better organization
- State management integration

**Key differences from more complex elements:**
- No Duration objects (simpler than Generator)
- No nested arrays (simpler than Activity)
- No special save patterns (simpler than Generator)
- Element-level storage (simpler than Model)
