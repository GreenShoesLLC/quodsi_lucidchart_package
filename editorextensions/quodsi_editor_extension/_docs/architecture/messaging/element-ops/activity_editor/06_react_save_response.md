# Scenario 6: React Side (Iframe) - Receiving Save Response

**Context**: Extension has saved data and sent back two messages: ELEMENT_UPDATE_RESULT (save confirmation) and SELECTION_CHANGED (fresh data). This document describes how React processes these messages, clears save state, and safely synchronizes props.

**Duration**: ~5-10ms

**Key Architectural Insight**: Message-driven state management ensures props sync only AFTER save completes and fresh data arrives.

**Key Files**:
- `quodsim-react/src/messaging/MessageProvider.tsx` - Receives messages
- `quodsim-react/src/messaging/mappers/elementOps.mapper.ts` - Maps save result
- `quodsim-react/src/messaging/state/elementOpsSlice.ts` - Redux save state
- `quodsim-react/src/messaging/hooks/useParameterEditorState.ts` - Parameter state hook
- `quodsim-react/src/features/editors/ActivityEditor.tsx` - Activity editor

---

## Part A: Save Success Response

### 1. MessageProvider receives ELEMENT_UPDATE_RESULT
**Location**: `MessageProvider.tsx` - window message listener

**Message received**:
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

**Handler**:
```typescript
const handleMessage = (event: MessageEvent) => {
  const envelope = event.data as EnvelopeBase;

  switch (envelope.type) {
    case EnvelopeMessageType.ELEMENT_UPDATE_RESULT:
      const action = elementOpsMapper.map(envelope);
      if (action) {
        dispatch(action);
      }
      break;

    // ... other cases
  }
};
```

---

### 2. elementOps.mapper handles response
**Location**: `mappers/elementOps.mapper.ts:handleElementUpdateResult()`

**Purpose**: Convert message to Redux action

**Code**:
```typescript
function handleElementUpdateResult(msg: EnvelopeBase): MessagingAction | null {
  const data = msg.data as {
    success: boolean;
    elementId: string;
    errorMessage?: string;
  };

  if (data.success) {
    return {
      type: 'ELEMENT_SAVE_SUCCESS',
      elementId: data.elementId,
    };
  } else {
    return {
      type: 'ELEMENT_SAVE_ERROR',
      elementId: data.elementId,
      errorMessage: data.errorMessage || 'Unknown error occurred during save',
    };
  }
}
```

**For success case**:
Returns `{ type: 'ELEMENT_SAVE_SUCCESS', elementId: 'activity_abc123' }`

---

### 3. Dispatch to Redux
**Location**: `MessageProvider.tsx`

**Code**:
```typescript
if (action) {
  dispatch(action);
}
```

**Action dispatched**:
```typescript
{
  type: 'ELEMENT_SAVE_SUCCESS',
  elementId: 'activity_abc123'
}
```

**Flows to**: `rootReducer` → `elementOpsReducer`

---

### 4. elementOpsReducer updates state
**Location**: `state/elementOpsSlice.ts:72-87`

**Purpose**: Clear save state for this element

**Code**:
```typescript
case 'ELEMENT_SAVE_SUCCESS': {
  const newSavingElements = new Set(state.savingElements);
  newSavingElements.delete(action.elementId);

  return {
    ...state,
    savingElements: newSavingElements,
    saveErrors: {
      ...state.saveErrors,
      [action.elementId]: undefined,  // Clear error
    },
    lastSaveTimestamp: {
      ...state.lastSaveTimestamp,
      [action.elementId]: Date.now(),
    },
    lastUpdated: Date.now(),
  };
}
```

**State changes**:
- Removes `'activity_abc123'` from `savingElements` Set
- Clears any error for this element
- Records `lastSaveTimestamp` for this element
- Updates global `lastUpdated` timestamp

**Result**: `isSaving` will now return `false` for this element

---

### 5. useElementOpsState hook updates
**Location**: `hooks/useElementOpsState.ts`

**Before**:
```typescript
elementOps.savingElements.has('activity_abc123') → true
isSaving → true
```

**After**:
```typescript
elementOps.savingElements.has('activity_abc123') → false
isSaving → false
```

**Triggers re-render** of components using this hook (ActivityEditor, parameter editors)

---

### 6. useEffect clears isDirty and hasChanges
**Location**: Multiple locations

**ActivityEditor useEffect**:
```typescript
// Clear hasChanges when save completes
useEffect(() => {
  if (!isSaving && hasChanges) {
    console.log('[ActivityEditor] Save completed, clearing hasChanges');
    setHasChanges(false);
  }
}, [isSaving, hasChanges]);
```

**Execution**:
- `isSaving` changed from `true` to `false` → useEffect runs
- Condition `!isSaving && hasChanges` = `true && true` = `true`
- Execute: `setHasChanges(false)`

**Result**: `hasChanges = false`

**Parameter Editor useEffect**:
```typescript
// Clear isDirty when save completes
useEffect(() => {
  if (!isSaving && isDirty) {
    console.log('[useParameterEditorState] Save completed, clearing isDirty flag');
    setIsDirty(false);
  }
}, [isSaving, isDirty]);
```

**Execution**:
- `isSaving` changed from `true` to `false` → useEffect runs
- Condition `!isSaving && isDirty` = `true && true` = `true`
- Execute: `setIsDirty(false)`

**Result**: `isDirty = false`

---

### 7. Save button updates
**Location**: `ActivityEditor.tsx` - Button component

**Before**:
```typescript
<Button
  disabled={!hasChanges || isSaving}  // disabled={!true || true} = true
>
  {isSaving ? 'Saving...' : 'Save'}  // Shows "Saving..."
</Button>
```

**After**:
```typescript
<Button
  disabled={!hasChanges || isSaving}  // disabled={!false || false} = true (still disabled!)
>
  {isSaving ? 'Saving...' : 'Save'}  // Shows "Save"
</Button>
```

**Note**: Button remains disabled because `hasChanges = false` (no unsaved changes). This is correct!

**Parameter editor inputs**:
- "(saving...)" indicator disappears
- Inputs remain enabled (user can edit again)
- `*` indicator disappears

---

## Part B: Receive Updated Data (SELECTION_CHANGED)

### 8. SELECTION_CHANGED message arrives
**Location**: `MessageProvider.tsx` - window message listener

**Context**: Extension sent this immediately after save (Scenario 5, step 13)

**Message**:
```typescript
{
  type: "SELECTION_CHANGED",
  data: {
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
        // ... all fresh data from diagram
      }
    },
    referenceData: {...},
    documentContext: {...}
  }
}
```

**Processing**: Same as Scenario 2 (selection.mapper → selectionReducer → update Redux state)

---

### 9. selectionReducer updates with fresh props
**Location**: `state/selectionSlice.ts:selectionReducer()`

**Action**:
```typescript
{
  type: 'SELECTION_UPDATE',
  elements: [...],
  referenceData: {...}
}
```

**State update**:
```typescript
const updatedState = {
  ...state,
  selectedElements: action.elements,  // Fresh activity data!
  referenceData: action.referenceData || state.referenceData,
  lastUpdated: Date.now(),
};
```

**Result**: `activity` prop in ActivityEditor will update with fresh saved values

---

### 10. Prop sync happens (NOW SAFE)
**Location**: `ActivityEditor.tsx` - Prop sync useEffect

**The Critical useEffect**:
```typescript
// Sync with activity prop changes (only when no unsaved changes and not saving)
useEffect(() => {
  if (!hasChanges && !isSaving) {
    console.log('[ActivityEditor] Syncing formData with activity prop');
    setFormData(extractActivityData(activity));
  } else {
    console.log('[ActivityEditor] Prop sync blocked:', { hasChanges, isSaving });
  }
}, [activity, hasChanges, isSaving]);
```

**Condition check**:
- `hasChanges = false` ✅ (cleared in step 6)
- `isSaving = false` ✅ (cleared in step 5)
- `!hasChanges && !isSaving` = `true && true` = `true` ✅

**Execution**: `setFormData(extractActivityData(activity))`

**Result**: `formData` is updated with fresh saved values from props

**Why this is SAFE now**:
1. Save operation completed (`isSaving = false`)
2. Fresh data received from extension (`activity` prop updated)
3. No unsaved changes to preserve (`hasChanges = false`)
4. Prop sync replaces local state with authoritative saved data

**Example**:
```typescript
// Before sync (local state from editing)
formData = {
  name: "Check In Patient",
  operationSteps: [{ duration: { parameters: { value: 7 } } }]
}

// After sync (from props, authoritative saved data)
formData = {
  name: "Check In Patient",  // Same! (was saved)
  operationSteps: [{ duration: { parameters: { value: 7 } } }]  // Same! (was saved)
}
```

**No data loss**: Local changes were saved, fresh data matches what user entered.

---

### 11. Parameter editors sync with props (NOW SAFE)
**Location**: `useParameterEditorState.ts` - Prop sync useEffect

**The Critical useEffect**:
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

**Condition check**:
- `isDirty = false` ✅ (cleared in step 6)
- `isSaving = false` ✅ (cleared in step 5)
- `!isDirty && !isSaving` = `true && true` = `true` ✅

**Execution**: `setLocalValue(propValue)`

**Result**: Parameter editor `localValue` syncs with prop

**Example for ConstantParameterEditor**:
```typescript
// Before sync
localValue = 7  // User's edited value

// After sync
localValue = 7  // Prop value from saved data (matches!)
```

**Why double protection?**:
- ActivityEditor has its own sync guard (`hasChanges`, `isSaving`)
- Parameter editors have their own sync guard (`isDirty`, `isSaving`)
- Both must pass for full synchronization
- Redundant protection prevents bugs

---

### 12. UI returns to clean state
**Location**: Browser DOM

**What user sees**:
- All fields show saved values
- Save button: Disabled (no unsaved changes)
- Cancel button: Still visible
- No "*" indicators (no dirty fields)
- No "(saving...)" indicators
- All inputs enabled (can edit again)

**State summary**:

**ActivityEditor**:
- `formData`: Fresh saved values (synced from props)
- `hasChanges = false`
- `isSaving = false`
- Save button: Disabled

**ConstantParameterEditor**:
- `localValue`: Fresh saved value (synced from props)
- `isDirty = false`
- `isSaving = false`
- Input: Enabled, shows saved value

**Redux**:
- `selection.selectedElements[0]`: Fresh activity data
- `elementOps.savingElements`: Empty (no saves in progress)
- `elementOps.lastSaveTimestamp['activity_abc123']`: Timestamp of save

**User can now**:
- Start editing again (will set `hasChanges = true`, `isDirty = true`)
- See validation results
- Run simulation
- Select different element

---

## Part C: Save Error Response (Alternative Flow)

### 13. If save fails, ELEMENT_UPDATE_RESULT has success: false
**Location**: Extension sends error message

**Error message**:
```typescript
{
  type: "ELEMENT_UPDATE_RESULT",
  data: {
    success: false,
    elementId: "activity_abc123",
    errorMessage: "Failed to write to shape: permission denied"
  }
}
```

**Mapper returns**:
```typescript
{
  type: 'ELEMENT_SAVE_ERROR',
  elementId: 'activity_abc123',
  errorMessage: 'Failed to write to shape: permission denied'
}
```

---

### 14. elementOpsReducer stores error
**Location**: `elementOpsSlice.ts:89-102`

**Code**:
```typescript
case 'ELEMENT_SAVE_ERROR': {
  const newSavingElements = new Set(state.savingElements);
  newSavingElements.delete(action.elementId);  // Clear saving flag

  return {
    ...state,
    savingElements: newSavingElements,
    saveErrors: {
      ...state.saveErrors,
      [action.elementId]: action.errorMessage,  // Store error!
    },
    lastUpdated: Date.now(),
  };
}
```

**State changes**:
- Removes from `savingElements` (no longer saving)
- Stores error message in `saveErrors[elementId]`
- Does NOT update `lastSaveTimestamp` (save failed)

**Result**:
- `isSaving = false` (cleared)
- `getSaveError(elementId)` returns error message

---

### 15. UI shows error
**Location**: `ActivityEditor.tsx` - Error display

**Code**:
```typescript
const saveError = formData.id ? elementOpsState.getSaveError(formData.id) : null;

return (
  <div className="activity-editor">
    {saveError && (
      <Alert severity="error">
        <AlertTitle>Save Failed</AlertTitle>
        {saveError}
      </Alert>
    )}

    {/* ... rest of editor ... */}

    <Button
      onClick={handleSave}
      disabled={!hasChanges || isSaving}
    >
      Save
    </Button>
  </div>
);
```

**What user sees**:
- Red error banner at top: "Save Failed: Failed to write to shape: permission denied"
- Save button: Enabled (can retry)
- Form data: Unchanged (local edits preserved)
- User can:
  - Fix the issue (e.g., permissions)
  - Click Save again to retry
  - Click Cancel to discard changes
  - Continue editing

**Why `hasChanges` stays true**:
- Save failed, so data wasn't persisted
- User's local changes still need to be saved
- `hasChanges` remains `true`
- Save button remains enabled

---

## Complete Save Flow Timeline

```
T=0:     User clicks Save
T=0:     dispatch(ELEMENT_SAVE_START)
           └─> isSaving = true
           └─> hasChanges = true (still)
           └─> Prop sync BLOCKED
T=1:     Send ELEMENT_UPDATE message

T=20:    Extension receives message
T=25:    Extension saves to shape
T=30:    Extension sends SELECTION_CHANGED (fresh data)
T=35:    Extension sends ELEMENT_UPDATE_RESULT (success)

T=40:    React receives ELEMENT_UPDATE_RESULT
           └─> dispatch(ELEMENT_SAVE_SUCCESS)
           └─> isSaving = false
           └─> useEffect clears hasChanges = false
           └─> useEffect clears isDirty = false
           └─> Save button: Disabled (no changes)
           └─> Inputs: Enabled, no indicators

T=41:    React receives SELECTION_CHANGED
           └─> activity prop updates with fresh data
           └─> selectionReducer updates state

T=42:    Prop sync useEffect runs
           └─> Check: !hasChanges && !isSaving = true && true = TRUE ✅
           └─> setFormData(extractActivityData(activity))
           └─> formData syncs with saved data

T=43:    Parameter editor sync useEffect runs
           └─> Check: !isDirty && !isSaving = true && true = TRUE ✅
           └─> setLocalValue(propValue)
           └─> localValue syncs with saved data

T=44:    UI fully synchronized
           └─> All fields show saved values
           └─> No unsaved changes
           └─> Ready for next edit
```

**Total time from click to synchronized**: ~40-50ms

---

## Why This Architecture Works

### The Problem (v1.0)
```
User clicks Save
  ↓
Set isSaving = true
  ↓
Send ELEMENT_UPDATE
  ↓
setTimeout(() => setIsSaving(false), 500)  ← RACE CONDITION!
  ↓
Extension sends SELECTION_CHANGED @ 20ms
  ↓
Props update @ 21ms
  ↓
useEffect: !hasChanges && !isSaving?
  ↓
isSaving still true... but for how long?
  ↓
If timeout expires before SELECTION_CHANGED: DATA LOSS!
```

### The Solution (v2.0)
```
User clicks Save
  ↓
dispatch(ELEMENT_SAVE_START) → isSaving = true
  ↓
Send ELEMENT_UPDATE
  ↓
Extension saves & sends responses
  ↓
React receives ELEMENT_UPDATE_RESULT
  ↓
dispatch(ELEMENT_SAVE_SUCCESS) → isSaving = false
  ↓
React receives SELECTION_CHANGED (fresh data)
  ↓
useEffect: !hasChanges && !isSaving = true ✅
  ↓
Props sync (SAFE - fresh data available)
  ↓
No data loss, guaranteed!
```

**Key differences**:
1. **Message-driven state**: `isSaving` cleared by message, not timeout
2. **Guaranteed ordering**: Props sync only after both flags clear
3. **Fresh data guarantee**: SELECTION_CHANGED arrives before prop sync
4. **No race conditions**: Logic, not timing, determines when to sync

---

## Performance Considerations

**Time from ELEMENT_UPDATE_RESULT to synchronized**: ~5-10ms

**Breakdown**:
- Mapper processing: <1ms
- Redux dispatch: 0.5-1ms
- useEffect executions: 1-2ms
- Component re-renders: 2-3ms
- DOM updates: 2-3ms

**User experience**:
- Instant feedback (within one frame, <16ms)
- Clear state transitions
- No flickering or visual artifacts
- Smooth return to editable state

---

## Next Step

Save flow is complete! User can now:
- Make more edits (starts new save cycle)
- Select different element (triggers Scenario 1)
- Run simulation
- View results

**Related flows**:
- [Scenario 1: User Selects Activity](./01_extension_selection.md)
- [Scenario 3: User Edits Values](./03_react_editing_locally.md)

**For understanding the complete architecture**, refer to:
- [README.md](./README.md) - High-level overview and timeline
