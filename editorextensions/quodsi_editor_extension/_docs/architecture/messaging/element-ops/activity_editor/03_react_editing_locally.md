# Scenario 3: React Side (Iframe) - User Edits Values (NOT Saving Yet)

**Context**: ActivityEditor is fully rendered with current activity data. User starts editing values in various fields. This document describes how local state buffering prevents prop changes from overwriting user input before save.

**Duration**: Immediate (<1ms per keystroke)

**Key Architectural Pattern**: **State Buffering with Sync Guards**

**Key Files**:
- `quodsim-react/src/features/editors/ActivityEditor.tsx` - Top-level activity editor
- `quodsim-react/src/messaging/hooks/useParameterEditorState.ts` - Parameter editor state hook
- `quodsim-react/src/features/distribution/parameters/ConstantParameterEditor.tsx` - Example parameter editor
- `quodsim-react/src/features/editors/OperationStepEditor.tsx` - Operation steps editor
- `quodsim-react/src/features/editors/RoutingConfigurationPanel.tsx` - Routing config editor

---

## Part A: User Types in Text Field (e.g., Activity Name)

### 1. User types in activity name input
**Location**: `ActivityEditor.tsx` - Details tab

**UI Element**:
```typescript
<TextField
  label="Name"
  value={formData.name}
  onChange={(e) => handleFieldChange('name', e.target.value)}
  disabled={isSaving}
/>
```

**What happens**:
- User types character (e.g., changes "Check In" to "Check In Patient")
- Browser fires `onChange` event
- React's synthetic event system captures it
- `handleFieldChange('name', newValue)` executes

---

### 2. handleChange() event handler executes
**Location**: `ActivityEditor.tsx:195-206`

**Purpose**: Update local formData with new value

**Code**:
```typescript
const handleFieldChange = (field: keyof FormData, value: any) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));

  // Mark as having changes
  if (!hasChanges) {
    setHasChanges(true);
  }
};
```

**For name field**: `field = 'name'`, `value = 'Check In Patient'`

**Result**: Schedules React state update

---

### 3. Update local formData state
**Location**: React state managed by `useState`

**Before**:
```typescript
formData = {
  id: "activity_abc123",
  name: "Check In",
  description: "...",
  operationSteps: [...],
  financialProperties: {...}
}
```

**After**:
```typescript
formData = {
  id: "activity_abc123",
  name: "Check In Patient",  // ← Changed!
  description: "...",
  operationSteps: [...],
  financialProperties: {...}
}
```

**Important**: This is LOCAL state, completely independent of props!

---

### 4. Set hasChanges flag
**Location**: `ActivityEditor.tsx` - `useState<boolean>`

**Before**: `hasChanges = false`

**After**: `hasChanges = true`

**Purpose**: This flag:
- Enables Save button (`disabled={!hasChanges || isSaving}`)
- Shows unsaved changes indicator (`*`)
- **BLOCKS prop synchronization** in useEffect

**The Critical useEffect**:
```typescript
// Sync with activity prop changes (only when no unsaved changes and not saving)
useEffect(() => {
  if (!hasChanges && !isSaving) {
    setFormData(extractActivityData(activity));
  }
}, [activity, hasChanges, isSaving]);
```

✅ Since `hasChanges = true`, the condition `!hasChanges` is false, so **no prop sync occurs**.

This prevents the prop `activity` from overwriting the user's new value.

---

### 5. Component re-renders with new local state
**Location**: React rendering cycle

**What re-renders**:
- `<TextField>` shows new value: "Check In Patient"
- Save button becomes enabled (no longer disabled)
- Unsaved indicator `*` appears in header

**What DOESN'T change**:
- Props (`activity`, `referenceData`, etc.) stay the same
- Redux state unchanged
- No messages sent to extension

**Performance**: Single component re-render, ~1-2ms

**User experience**: Immediate visual feedback, feels responsive

---

## Part B: User Edits Operation Step Duration

This is more complex because it involves nested components with parameter editors that have their own state buffering.

### 6. User changes duration value in OperationStepEditor
**Location**: `OperationStepEditor.tsx` → `EnhancedDurationEditor.tsx` → `DistributionParametersEditor.tsx` → `ConstantParameterEditor.tsx`

**Component hierarchy**:
```
ActivityEditor
  └─> OperationStepEditor
       └─> EnhancedDurationEditor
            └─> DistributionParametersEditor
                 └─> ConstantParameterEditor
```

**User action**: Changes duration from 5 minutes to 7 minutes

**UI Element in ConstantParameterEditor**:
```typescript
<input
  type="number"
  value={localValue}
  onChange={handleChange}
  disabled={disabled || isSaving}
  min={metadata.min}
  step={metadata.step}
/>
```

---

### 7. ConstantParameterEditor.handleChange() fires
**Location**: `parameters/ConstantParameterEditor.tsx:29-47`

**Purpose**: Process new value and update local state

**Code**:
```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newValue = parseFloat(e.target.value);
  const sanitizedValue = isNaN(newValue) ? 0 : newValue;

  // Update local state immediately for responsive UI
  setLocalValue(sanitizedValue);
  setIsDirty(true);

  // Create updated parameters
  const updatedParams: ConstantParameters = {
    ...parameters,
    value: sanitizedValue
  };

  // Only propagate change if parameters are valid
  if (ConstantDistribution.validateParameters(updatedParams)) {
    onChange(updatedParams);
  }
};
```

**Processing**:
- Parse input: `parseFloat("7")` = `7`
- Validate: Not NaN, so use `7`
- Update local value: `setLocalValue(7)`
- Mark dirty: `setIsDirty(true)`
- Validate parameters: Check if `{ value: 7 }` is valid
- If valid: Call `onChange` to propagate upward

---

### 8. useParameterEditorState hook manages state
**Location**: `hooks/useParameterEditorState.ts:27-92`

**Purpose**: Provide state buffering with sync guards for parameter editors

**Hook state**:
```typescript
const { localValue, setLocalValue, isDirty, setIsDirty, isSaving } =
  useParameterEditorState(parameters.value, elementId);
```

**Internal state**:
```typescript
const [localValue, setLocalValue] = useState<T>(propValue);  // Buffer
const [isDirty, setIsDirty] = useState(false);               // Change flag

const elementOps = useElementOpsState();
const isSaving = elementId ? elementOps.isSaving(elementId) : false;
```

**The Critical useEffect (Prop Sync Guard)**:
```typescript
// Sync with prop only when safe (not dirty and not saving)
useEffect(() => {
  if (!isDirty && !isSaving) {
    console.log('[useParameterEditorState] Syncing with prop value:', propValue);
    setLocalValue(propValue);
  } else {
    console.log('[useParameterEditorState] Sync blocked:', { isDirty, isSaving });
  }
}, [propValue, isDirty, isSaving]);
```

**Current state**:
- `localValue = 7` (user's input)
- `isDirty = true` (just set)
- `isSaving = false` (from Redux)
- `propValue = 5` (from props, hasn't changed)

✅ Since `isDirty = true`, the condition `!isDirty` is false, so **prop sync is blocked**.

**Why this matters**: If a SELECTION_CHANGED message arrives with old data (value=5), the prop would update to 5, but `localValue` stays 7 because sync is blocked. User's input is protected!

---

### 9. Visual feedback renders
**Location**: `ConstantParameterEditor.tsx:49-70`

**UI updates**:
```typescript
<label className="block text-xs text-gray-600 font-medium mb-0.5">
  {metadata.label}
  {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
  {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
</label>
```

**What user sees**:
- Input shows new value: `7`
- Orange `*` indicator appears (isDirty)
- No "(saving...)" text yet (isSaving = false)

**If isSaving were true**:
- Input would be disabled: `disabled={disabled || isSaving}`
- "(saving...)" text would appear
- Prevents user from making more changes while save is in progress

---

### 10. Propagate change upward (optimistic)
**Location**: `ConstantParameterEditor.tsx:44-46`

**Purpose**: Update parent components so they can update their state

**Call chain**:
```
ConstantParameterEditor.onChange(updatedParams)
  ↓
DistributionParametersEditor.handleParameterUpdate(updatedParams)
  ↓
EnhancedDurationEditor.handleDistributionChange(updatedDistribution)
  ↓
OperationStepEditor.handleStepChange(updatedStep)
  ↓
ActivityEditor.handleOperationStepsChange(updatedSteps)
```

**Why "optimistic"?**:
- We propagate the change immediately WITHOUT waiting for server confirmation
- The change is only in local state, not persisted
- If save fails, we can roll back
- Provides responsive UI (user sees changes immediately)

---

### 11. ActivityEditor receives updated operation steps
**Location**: `ActivityEditor.tsx:278-291`

**Handler**:
```typescript
const handleOperationStepsChange = (updatedSteps: OperationStep[]) => {
  setFormData(prev => ({
    ...prev,
    operationSteps: updatedSteps
  }));

  if (!hasChanges) {
    setHasChanges(true);
  }
};
```

**Result**:
- `formData.operationSteps` updated with new duration value
- `hasChanges` set to true (if not already)
- Save button enabled
- Component re-renders

---

### 12. State remains local
**Location**: React component state

**Current state across hierarchy**:

**ActivityEditor**:
- `formData.operationSteps[0].duration.parameters.value = 7`
- `hasChanges = true`
- `isSaving = false`

**ConstantParameterEditor**:
- `localValue = 7`
- `isDirty = true`
- `isSaving = false`

**Redux**:
- `selection.selectedElements[0].data.operationSteps[0].duration.parameters.value = 5` (UNCHANGED!)

**Extension**:
- Shape data still has `value: 5` (UNCHANGED!)

**Important**: All changes are buffered in component state. Nothing persisted yet.

---

## Part C: User Changes Routing Configuration

### 13. User changes routing type dropdown
**Location**: `RoutingConfigurationContent.tsx` → `RoutingConfigurationPanel.tsx`

**Scenario**: User changes routing from "Probability" to "State Condition"

**Component**:
```typescript
<Select
  value={activity.routingType}
  onChange={(value) => handleRoutingTypeChange(value as RoutingType)}
  disabled={outgoingConnectors.length <= 1}
>
  <Option value="Probability">Probability</Option>
  <Option value="StateCondition">State Condition</Option>
  <Option value="EntityTemplate">Entity Template</Option>
</Select>
```

**Handler**:
```typescript
const handleRoutingTypeChange = (newType: RoutingType) => {
  setLocalActivity(prev => ({
    ...prev,
    routingType: newType
  }));

  // Update connectors based on routing type
  if (newType === RoutingType.Probability) {
    // Ensure probabilities sum to 1.0
    initializeProbabilities();
  } else if (newType === RoutingType.StateCondition) {
    // Clear probabilities, prepare for state conditions
    clearProbabilities();
  }
};
```

**State update**: Local `activity` state updated with new routing type

---

### 14. User adjusts probability values
**Location**: `RoutingConfigurationPanel.tsx:208-240`

**Scenario**: User has 2 outgoing connectors, adjusts probabilities

**UI**:
```typescript
{localConnectors.map((conn, idx) => (
  <div key={conn.id}>
    <label>{conn.targetName}</label>
    <input
      type="number"
      value={conn.probability || 0}
      onChange={(e) => handleProbabilityChange(idx, parseFloat(e.target.value))}
      min={0}
      max={1}
      step={0.1}
    />
  </div>
))}
```

**Handler**:
```typescript
const handleProbabilityChange = (index: number, newProbability: number) => {
  const updatedConnectors = [...localConnectors];
  updatedConnectors[index] = {
    ...updatedConnectors[index],
    probability: newProbability
  };

  setLocalConnectors(updatedConnectors);

  // Propagate to parent
  onChange(updatedConnectors);
};
```

**State**: Local `connectors` array updated

---

### 15. Validation happens in real-time
**Location**: `RoutingConfigurationPanel.tsx:192-204`

**Validation for probability routing**:
```typescript
const validateProbabilities = (): boolean => {
  const total = localConnectors.reduce((sum, conn) => sum + (conn.probability || 0), 0);

  if (Math.abs(total - 1.0) > 0.01) {
    setError(`Probabilities must sum to 1.0 (currently ${total.toFixed(2)})`);
    return false;
  }

  setError(null);
  return true;
};

// Run validation on connector changes
useEffect(() => {
  if (activity.routingType === RoutingType.Probability) {
    validateProbabilities();
  }
}, [localConnectors, activity.routingType]);
```

**UI feedback**:
- If probabilities don't sum to 1.0: Shows error message
- Save button can still be enabled (save will fail validation)
- Real-time feedback helps user fix issues before saving

---

### 16. All changes remain local until Save
**Location**: Component state throughout tree

**Summary of local state**:

**ActivityEditor** (`formData`):
- `name`: "Check In Patient" (changed)
- `description`: "..." (unchanged)
- `operationSteps[0].duration.parameters.value`: 7 (changed)
- `routingType`: "StateCondition" (changed)
- `hasChanges`: true

**ConstantParameterEditor** (`localValue`, `isDirty`):
- `localValue`: 7 (changed)
- `isDirty`: true

**RoutingConfigurationPanel** (`localActivity`, `localConnectors`):
- `localActivity.routingType`: "StateCondition" (changed)
- `localConnectors`: [...] (updated state conditions)

**Redux state**: UNCHANGED
- `selection.selectedElements[0]` still has old values

**Extension state**: UNCHANGED
- Shape data in diagram still has old values

**Messages sent to extension**: NONE

**Why this architecture?**:
1. **Responsive UI**: Changes appear instantly
2. **Protection from race conditions**: Props can't overwrite local state while editing
3. **Batch updates**: Can make multiple changes before saving
4. **Easy cancel**: Can discard all changes by resetting local state
5. **No network traffic**: No messages until user clicks Save

---

## State Synchronization Guards

The key pattern preventing data loss:

### ActivityEditor Sync Guard
```typescript
useEffect(() => {
  if (!hasChanges && !isSaving) {
    setFormData(extractActivityData(activity));
  }
}, [activity, hasChanges, isSaving]);
```

**Blocks prop sync when**:
- `hasChanges = true` (user has edited)
- `isSaving = true` (save in progress)

### Parameter Editor Sync Guard
```typescript
useEffect(() => {
  if (!isDirty && !isSaving) {
    setLocalValue(propValue);
  }
}, [propValue, isDirty, isSaving]);
```

**Blocks prop sync when**:
- `isDirty = true` (user has edited)
- `isSaving = true` (save in progress)

**Why two flags?**:
- `isDirty/hasChanges`: Protects during editing
- `isSaving`: Protects during save operation
- Both must be false for safe prop synchronization

---

## Example Timeline

```
T=0:    User types in name field
        └─> hasChanges = true
        └─> Save button enabled
        └─> Prop sync blocked by hasChanges

T=100:  User changes duration to 7
        └─> localValue = 7, isDirty = true
        └─> Prop sync blocked by isDirty
        └─> * indicator appears

T=200:  SELECTION_CHANGED arrives (from some other operation)
        └─> activity prop updates with OLD value (5)
        └─> useEffect checks: !hasChanges && !isSaving
        └─> Condition false, no sync!
        └─> localValue stays 7 ✅

T=300:  User changes routing type
        └─> localActivity updated
        └─> Still buffered locally

T=400:  User clicks Save
        └─> Continues to Scenario 4...
```

---

## Performance Considerations

**Per-keystroke overhead**:
- Event handler: <0.1ms
- State update (setState): 0.1-0.2ms
- Component re-render: 1-2ms
- DOM update: 0.5-1ms
- **Total**: ~2-4ms per keystroke

**Why fast?**:
- Only affected component re-renders (not entire tree)
- No Redux dispatch (no global state change)
- No postMessage (no IPC overhead)
- No network calls
- React batches multiple setState calls

**Memory overhead**:
- FormData object: ~1-2KB
- Parameter editor local state: ~0.1KB per editor
- Total: Negligible (<10KB for typical activity)

---

## Next Step

User has made changes and is ready to save. They click the Save button.

**Continue to**: [04_react_save_button.md](./04_react_save_button.md) to see what happens when the user initiates the save operation.
