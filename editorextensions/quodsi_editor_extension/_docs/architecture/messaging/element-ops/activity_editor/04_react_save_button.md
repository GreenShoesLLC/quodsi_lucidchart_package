# Scenario 4: React Side (Iframe) - User Clicks Save Button

**Context**: User has edited activity values (name, operation steps, routing, etc.) and local state contains all changes. User now clicks the Save button to persist changes. This document describes the save initiation flow, Redux integration, and message sending.

**Duration**: Immediate (~1-5ms before message sent)

**Key Architectural Pattern**: **Redux-Based Save State Management**

**Key Files**:
- `quodsim-react/src/features/editors/ActivityEditor.tsx` - Save button handler
- `quodsim-react/src/messaging/state/elementOpsSlice.ts` - Redux save state slice
- `quodsim-react/src/messaging/senders/modelOpsSender.ts` - Message sender
- `quodsim-react/src/messaging/hooks/useElementOpsState.ts` - Save state hook

---

## Step-by-Step Flow

### 1. User clicks Save button
**Location**: `ActivityEditor.tsx:860-868`

**UI Element**:
```typescript
<Button
  onClick={handleSave}
  disabled={!hasChanges || isSaving}
  className="btn-primary"
>
  {isSaving ? 'Saving...' : 'Save'}
</Button>
```

**State before click**:
- `hasChanges = true` (user made edits)
- `isSaving = false` (not currently saving)
- Button is enabled

**Event**: Click fires `handleSave()` function

---

### 2. ActivityEditor.handleSave() starts
**Location**: `ActivityEditor.tsx:364-395`

**Purpose**: Validate data and initiate save operation

**Code**:
```typescript
const handleSave = async () => {
  // Validate we have changes and an ID
  if (!hasChanges || !formData.id) {
    console.warn('[ActivityEditor] Cannot save: no changes or missing ID');
    return;
  }

  console.log('[ActivityEditor] Initiating save for activity:', formData.id);

  // Extract operation steps with proper typing
  const operationSteps = formData.operationSteps.map(step => ({
    ...step,
    // Ensure duration is properly structured
    duration: step.duration || {
      durationType: DurationType.Processing,
      duration: createDefaultDistribution(DistributionType.CONSTANT)
    }
  }));

  // Build save data
  const saveData: Record<string, any> = {
    id: formData.id,
    name: formData.name,
    description: formData.description,
    operationSteps,
    financialProperties: formData.financialProperties
  };

  // Call onSave callback (comes from ElementEditor → ModelPanel → useModelPanel)
  onSave(saveData);
};
```

**Validation**:
- Checks `hasChanges` is true
- Checks `formData.id` exists
- If either fails, abort save

**Data preparation**:
- Extracts formData fields
- Ensures operation steps have proper structure
- Creates `saveData` object with all changes

**Important**: Does NOT set `isSaving = true` here. That happens via Redux.

---

### 3. Dispatch ELEMENT_SAVE_START to Redux
**Location**: `modelOpsSender.ts:29-57` (called via `onSave` callback)

**Purpose**: Mark element as "saving" in Redux before sending message

**Call chain**:
```
ActivityEditor.onSave(saveData)
  ↓ (prop passed from ElementEditor)
ElementEditor.handleSave(data)
  ↓ (prop passed from ModelPanel)
ModelPanel.onElementUpdate(id, type, data, diagramElementType)
  ↓ (from useModelPanel hook)
modelOpsSender.updateElementData(id, type, data, diagramElementType)
```

**Code in modelOpsSender.ts**:
```typescript
const updateElementData = (
  elementId: string,
  type: string,
  data: Record<string, any>,
  diagramElementType?: string
) => {
  console.log('[modelOpsSender] Updating element:', { elementId, type, diagramElementType });

  // Dispatch ELEMENT_SAVE_START action to Redux to track save state
  dispatch({
    type: 'ELEMENT_SAVE_START',
    elementId,
    optimisticData: data,  // Optional: for optimistic updates
  });

  // Send ELEMENT_UPDATE message to extension
  send(EnvelopeMessageType.ELEMENT_UPDATE, {
    elementId,
    type,
    data: { ...data, id: elementId },
    diagramElementType
  });
};
```

**Why dispatch first?**:
- Sets `isSaving = true` BEFORE sending message
- Prevents race conditions
- Blocks prop syncs immediately
- Provides instant UI feedback

---

### 4. elementOpsReducer updates save state
**Location**: `messaging/state/elementOpsSlice.ts:42-70`

**Purpose**: Track which elements are currently saving

**Redux action received**:
```typescript
{
  type: 'ELEMENT_SAVE_START',
  elementId: 'activity_abc123',
  optimisticData: {
    id: 'activity_abc123',
    name: 'Check In Patient',
    description: '...',
    operationSteps: [...],
    // ... all save data
  }
}
```

**Reducer logic**:
```typescript
export function elementOpsReducer(
  state: ElementOpsState = initialState,
  action: ElementOpsAction
): ElementOpsState {
  switch (action.type) {
    case 'ELEMENT_SAVE_START': {
      const newSavingElements = new Set(state.savingElements);
      newSavingElements.add(action.elementId);

      return {
        ...state,
        savingElements: newSavingElements,
        saveErrors: {
          ...state.saveErrors,
          [action.elementId]: undefined  // Clear any previous error
        },
        optimisticData: action.optimisticData
          ? { ...state.optimisticData, [action.elementId]: action.optimisticData }
          : state.optimisticData,
        lastUpdated: Date.now(),
      };
    }

    // ... other cases
  }
}
```

**State changes**:
- Adds `'activity_abc123'` to `savingElements` Set
- Clears any previous error for this element
- Stores optimistic data (optional feature)
- Updates timestamp

**Result**: Redux state now indicates element is saving

---

### 5. useElementOpsState detects saving
**Location**: `hooks/useElementOpsState.ts:17-45`

**Purpose**: Provide helper functions to check save state

**Hook usage in ActivityEditor**:
```typescript
const elementOpsState = useElementOpsState();
const isSaving = formData.id ? elementOpsState.isSaving(formData.id) : false;
```

**Hook implementation**:
```typescript
export function useElementOpsState() {
  const elementOps = useElementOps();  // Gets elementOpsSlice from Redux

  const elementOpsState = useMemo(() => ({
    isSaving: (elementId: string): boolean => {
      return elementOps.savingElements.has(elementId);
    },

    getSaveError: (elementId: string): string | undefined => {
      return elementOps.saveErrors[elementId];
    },

    getLastSaveTime: (elementId: string): number | undefined => {
      return elementOps.lastSaveTimestamp[elementId];
    },

    // ... other helpers
  }), [elementOps]);

  return elementOpsState;
}
```

**After ELEMENT_SAVE_START**:
- `elementOps.savingElements.has('activity_abc123')` returns `true`
- `isSaving` hook result changes from `false` to `true`
- ActivityEditor re-renders

---

### 6. Visual feedback shows saving state
**Location**: `ActivityEditor.tsx` - multiple locations

**Save button updates**:
```typescript
<Button
  onClick={handleSave}
  disabled={!hasChanges || isSaving}  // Now disabled!
>
  {isSaving ? 'Saving...' : 'Save'}  // Shows "Saving..."
</Button>
```

**Parameter editors show saving**:
```typescript
// In ConstantParameterEditor
<label>
  {metadata.label}
  {isDirty && <span className="text-orange-500">*</span>}
  {isSaving && <span className="text-blue-500">(saving...)</span>}
</label>

<input
  type="number"
  value={localValue}
  onChange={handleChange}
  disabled={disabled || isSaving}  // Now disabled!
/>
```

**What user sees**:
- Save button changes to "Saving..." and becomes disabled
- Parameter inputs show "(saving...)" indicator
- All inputs become disabled (can't edit during save)
- UI clearly indicates save is in progress

---

### 7. Prop sync is BLOCKED by isSaving flag
**Location**: `ActivityEditor.tsx` - useEffect hook

**The Critical Protection**:
```typescript
// Sync with activity prop changes (only when no unsaved changes and not saving)
useEffect(() => {
  if (!hasChanges && !isSaving) {
    setFormData(extractActivityData(activity));
  }
}, [activity, hasChanges, isSaving]);
```

**Current state**:
- `hasChanges = true` (still true)
- `isSaving = true` (just changed!)

**Condition**: `!hasChanges && !isSaving` = `false && false` = `false`

✅ **Prop sync is BLOCKED**

**Why this matters critically**:
1. Extension will send SELECTION_CHANGED after save (~20-50ms)
2. That message contains the OLD data (what was in diagram before save)
3. If props synced now, user's changes would be overwritten!
4. `isSaving` flag prevents this race condition

**This was the bug in v1.0**: Used 500ms timeout instead of message-driven state. SELECTION_CHANGED arrived before timeout expired, causing data loss.

---

### 8. Parameter editors also blocked
**Location**: `useParameterEditorState.ts:40-47`

**The Protection at Parameter Level**:
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
- `isDirty = true`
- `isSaving = true` (from Redux via `elementOpsState.isSaving(elementId)`)

✅ **Prop sync is BLOCKED** at parameter editor level too

**Double protection**: Even if ActivityEditor failed to block, parameter editors would block independently.

---

### 9. Build envelope message
**Location**: `senders/modelOpsSender.ts:49-55`

**Purpose**: Create standardized message envelope for extension

**Code**:
```typescript
send(EnvelopeMessageType.ELEMENT_UPDATE, {
  elementId,
  type,
  data: { ...data, id: elementId },
  diagramElementType
});
```

**send() helper** (from `useSendMessage` hook):
```typescript
const send = (messageType: EnvelopeMessageType, data: any) => {
  const envelope: EnvelopeBase = {
    id: `${messageType}_${Date.now()}`,
    type: messageType,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data
  };

  window.parent.postMessage(envelope, '*');
};
```

**Envelope structure**:
```typescript
{
  id: "ELEMENT_UPDATE_1705321234567",
  type: "ELEMENT_UPDATE",
  source: "model-iframe",
  target: "host",
  version: "1.0",
  data: {
    elementId: "activity_abc123",
    type: "Activity",
    data: {
      id: "activity_abc123",
      name: "Check In Patient",
      description: "Patient arrives and checks in",
      operationSteps: [
        {
          id: "step1",
          duration: {
            durationType: "Processing",
            duration: {
              distributionType: "Constant",
              parameters: { value: 7 }  // User's new value!
            }
          },
          resourceRequirements: [...]
        }
      ],
      financialProperties: { cost: 100, revenue: 0 }
    },
    diagramElementType: "BLOCK"
  }
}
```

---

### 10. Send via postMessage
**Location**: `useSendMessage.ts` → `window.parent.postMessage()`

**Purpose**: Cross iframe boundary to extension

**Code**:
```typescript
window.parent.postMessage(envelope, '*');
```

**What happens**:
- Browser serializes envelope to JSON
- Message crosses iframe boundary (IPC)
- Extension's message listener receives it

**Performance**: ~1-2ms for serialization and IPC

---

### 11. React waits for response
**Location**: React UI state

**Current state summary**:

**ActivityEditor**:
- `formData`: Contains all user changes
- `hasChanges = true` (still true)
- `isSaving = true` (from Redux)
- Save button: Disabled, shows "Saving..."
- Cancel button: Still enabled (user can cancel)

**Redux (`elementOpsSlice`)**:
- `savingElements`: Contains `'activity_abc123'`
- `saveErrors`: No error for this element (cleared)
- `lastSaveTimestamp`: Will be updated on success

**Parameter Editors**:
- `localValue`: User's edited values
- `isDirty = true`
- `isSaving = true` (from Redux)
- Inputs: Disabled, show "(saving...)"

**Prop Sync Guards**:
- Activity Editor: ✅ BLOCKED by `isSaving`
- Parameter Editors: ✅ BLOCKED by `isDirty` and `isSaving`

**User Experience**:
- Clear visual feedback that save is happening
- Cannot make more edits during save
- Cannot click Save again (button disabled)
- Can still click Cancel (would discard changes)

**What React is waiting for**:
1. `ELEMENT_UPDATE_RESULT` message (success or error)
2. `SELECTION_CHANGED` message (fresh data from extension)

These will be handled in Scenario 6.

---

## Message Format

Complete ELEMENT_UPDATE message sent to extension:

```typescript
{
  id: "ELEMENT_UPDATE_1705321234567",
  type: "ELEMENT_UPDATE",
  source: "model-iframe",
  target: "host",
  version: "1.0",
  data: {
    elementId: "activity_abc123",
    type: "Activity",
    diagramElementType: "BLOCK",
    data: {
      id: "activity_abc123",
      name: "Check In Patient",
      description: "Patient arrives and checks in at front desk",
      operationSteps: [
        {
          id: "step_1",
          duration: {
            durationType: "Processing",
            duration: {
              distributionType: "Constant",
              description: "",
              parameters: { value: 7 }  // Changed from 5 to 7
            }
          },
          resourceRequirements: [
            {
              id: "req_1",
              resourceId: "resource_nurse",
              quantity: 1,
              // ... requirement details
            }
          ]
        }
      ],
      financialProperties: {
        cost: 100,
        revenue: 0,
        costType: "Fixed"
      }
    }
  }
}
```

---

## Redux State Flow

```
User Clicks Save
  ↓
ActivityEditor.handleSave()
  ↓
onSave callback
  ↓
modelOpsSender.updateElementData()
  ↓
dispatch({ type: 'ELEMENT_SAVE_START' })
  ↓
elementOpsReducer
  ↓
state.savingElements.add(elementId)
  ↓
useElementOpsState.isSaving() → true
  ↓
ActivityEditor re-renders
  ↓
Save button: "Saving...", disabled
Inputs: disabled
Prop sync: BLOCKED
```

---

## Race Condition Prevention

**The Problem (v1.0)**:
- Used 500ms setTimeout to clear `isSaving`
- SELECTION_CHANGED arrived ~20-50ms after save
- Timeout hadn't expired yet
- But no guarantee it would clear at right time
- Sometimes timeout expired before SELECTION_CHANGED
- Props synced too early, overwrote user changes

**The Solution (v2.0)**:
- Redux tracks save state globally
- `isSaving` set via ELEMENT_SAVE_START dispatch
- `isSaving` cleared via ELEMENT_SAVE_SUCCESS dispatch
- Message-driven state changes (not time-based)
- SELECTION_CHANGED arrives with fresh data
- `isSaving` cleared only after save completes
- Props sync only when both `!hasChanges && !isSaving`
- Guaranteed safe synchronization

**Timeline (v2.0)**:
```
T=0:     User clicks Save
T=0:     dispatch(ELEMENT_SAVE_START) → isSaving = true
T=1:     postMessage(ELEMENT_UPDATE)
T=20:    Extension receives message
T=25:    Extension saves to LucidChart
T=30:    Extension sends SELECTION_CHANGED (fresh data)
T=35:    Extension sends ELEMENT_UPDATE_RESULT
T=40:    React receives ELEMENT_UPDATE_RESULT
T=40:    dispatch(ELEMENT_SAVE_SUCCESS) → isSaving = false
T=41:    React receives SELECTION_CHANGED
T=41:    Prop sync: !hasChanges && !isSaving → NOW SAFE!
T=42:    useEffect syncs formData with fresh activity prop
```

**Key insight**: Message-driven state changes ensure synchronization happens in correct order, every time.

---

## Performance Considerations

**Time from click to message sent**: ~1-5ms

**Breakdown**:
- handleSave() execution: <1ms
- Redux dispatch: 0.5-1ms
- Component re-render: 1-2ms
- postMessage serialization: 0.5-1ms
- IPC to extension: <1ms

**Memory overhead**:
- Redux state increase: ~1KB (elementId in Set, optimisticData)
- Envelope serialization: ~2-5KB (depends on activity complexity)
- Total: Negligible

**UI responsiveness**:
- Button feedback: Immediate (<16ms, within 1 frame)
- User cannot perform conflicting actions (disabled inputs)
- Clear visual indication of save in progress

---

## Next Step

Message has been sent to extension. Extension will now receive and process the save request.

**Continue to**: [05_extension_handle_save.md](./05_extension_handle_save.md) to see how the extension persists the data to LucidChart and responds.
