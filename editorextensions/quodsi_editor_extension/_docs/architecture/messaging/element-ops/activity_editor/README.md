# Activity Editor Complete Flow

This directory documents the complete lifecycle of editing an Activity in the Quodsi LucidChart extension, from initial selection through editing to saving and receiving confirmation.

## Overview

The Activity Editor flow involves communication between two separate JavaScript contexts:
- **Extension Side**: TypeScript code running in the LucidChart host environment
- **React Side**: React application running in an iframe, communicating via postMessage

This architecture creates specific challenges around state synchronization, particularly preventing race conditions where prop updates overwrite user input during save operations.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LUCIDCHART HOST (Extension)                      │
│                                                                     │
│  User Clicks    SelectionHandler    ActivityProcessor              │
│  Activity  ──>  (Coordinates)  ──>  (Builds Data)  ──>             │
│                                                                     │
│                                      postMessage                    │
│                                           │                         │
└───────────────────────────────────────────┼─────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REACT IFRAME (UI Components)                     │
│                                                                     │
│  MessageProvider  ──>  Redux Store  ──>  useModelPanel  ──>        │
│  (Receives msg)        (State mgmt)      (Hook)                    │
│                                                           │         │
│                                                           ▼         │
│                          ModelPanel ──> ElementEditor ──>           │
│                                         ActivityEditor              │
│                                              │                      │
│                         User Edits (local state buffering)          │
│                                              │                      │
│                         User Clicks Save     │                      │
│                                              ▼                      │
│                          ELEMENT_UPDATE (postMessage)               │
│                                                                     │
└───────────────────────────────────────────┬─────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LUCIDCHART HOST (Extension)                      │
│                                                                     │
│  ElementOpsHandler  ──>  ModelManager  ──>  StorageAdapter  ──>    │
│  (Receives msg)          (Updates)          (Persists to shape)    │
│                                                       │             │
│                                                       ▼             │
│                          SelectionHandler ──> Sends fresh data      │
│                          ELEMENT_UPDATE_RESULT                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
                                     React receives both:
                                     - SAVE_SUCCESS
                                     - SELECTION_CHANGED (fresh data)
```

## Complete Flow Documents

### 1. [Extension Side: User Selects Activity](./01_extension_selection.md)
**When to read**: Understanding how the extension detects selection and prepares data for React.

Covers:
- Selection event handling
- ActivityProcessor data preparation
- Building reference data
- Sending SELECTION_CHANGED message

**Key files**: `SelectionHandler.ts`, `ActivityProcessor.ts`, `MessageRouter.ts`

### 2. [React Side: Receiving and Displaying ActivityEditor](./02_react_receive_and_display.md)
**When to read**: Understanding how React receives selection data and renders the editor.

Covers:
- postMessage reception
- Redux state updates
- useModelPanel hook computation
- Component rendering hierarchy
- Outgoing connector filtering

**Key files**: `MessageProvider.tsx`, `selection.mapper.ts`, `useModelPanel.ts`, `ActivityEditor.tsx`

### 3. [React Side: User Edits Values (Not Saving)](./03_react_editing_locally.md)
**When to read**: Understanding how local state buffering prevents premature prop syncs.

Covers:
- Local state management in ActivityEditor
- Parameter editor state buffering
- useParameterEditorState hook
- Visual feedback (isDirty indicators)
- Why no messages are sent during editing

**Key files**: `ActivityEditor.tsx`, `useParameterEditorState.ts`, `ConstantParameterEditor.tsx`

### 4. [React Side: User Clicks Save Button](./04_react_save_button.md)
**When to read**: Understanding the save initiation and Redux integration.

Covers:
- ELEMENT_SAVE_START dispatch
- Redux save state management
- isSaving flag blocking prop syncs
- Building and sending ELEMENT_UPDATE message

**Key files**: `ActivityEditor.tsx`, `modelOpsSender.ts`, `elementOpsSlice.ts`

### 5. [Extension Side: Handling Save Message](./05_extension_handle_save.md)
**When to read**: Understanding how the extension persists data to LucidChart.

Covers:
- ElementOpsHandler receiving message
- StorageAdapter writing to shape data
- Triggering selection refresh
- Sending ELEMENT_UPDATE_RESULT and SELECTION_CHANGED

**Key files**: `ElementOpsHandler.ts`, `ModelManager.ts`, `StorageAdapter.ts`

### 6. [React Side: Receiving Save Response](./06_react_save_response.md)
**When to read**: Understanding how save completion enables safe prop synchronization.

Covers:
- ELEMENT_SAVE_SUCCESS Redux action
- Clearing isSaving and isDirty flags
- Safe prop sync after save completes
- Error handling for failed saves

**Key files**: `elementOps.mapper.ts`, `elementOpsSlice.ts`, `ActivityEditor.tsx`, `useParameterEditorState.ts`

## Complete Round-Trip Timeline

```
USER SELECTS ACTIVITY
  └─> Extension: Process selection (5-10ms)
      └─> Extension: Send SELECTION_CHANGED
          └─> React: Receive & render (10-20ms)
              └─> User sees ActivityEditor (TOTAL: ~15-30ms)

USER EDITS VALUES
  └─> React: Update local state (immediate, <1ms)
      └─> React: Visual feedback (immediate)
          └─> No messages sent, all local

USER CLICKS SAVE
  └─> React: Dispatch ELEMENT_SAVE_START (immediate)
      └─> React: Show "Saving..." state (immediate)
          └─> React: Send ELEMENT_UPDATE message
              └─> Extension: Receive & save to LucidChart (5-10ms)
                  └─> Extension: Send SELECTION_CHANGED (5ms)
                  └─> Extension: Send ELEMENT_UPDATE_RESULT (5ms)
                      └─> React: Receive SAVE_SUCCESS (20-50ms total)
                          └─> React: Clear isSaving flag
                              └─> React: Receive fresh SELECTION_CHANGED
                                  └─> React: Sync props (safe now!)
                                      └─> User sees saved state (TOTAL: ~50-100ms)
```

## Key Architectural Patterns

### State Synchronization Guards

The critical insight is using **two flags** to prevent premature prop synchronization:

```typescript
// In ActivityEditor
useEffect(() => {
  if (!hasChanges && !isSaving) {
    setFormData(extractActivityData(activity));
  }
}, [activity, hasChanges, isSaving]);
```

- **hasChanges**: Set when user makes local edits
- **isSaving**: Set via Redux when save is in progress

Both must be false for props to sync to local state.

### Parameter Editor State Buffering

```typescript
// In useParameterEditorState hook
const [localValue, setLocalValue] = useState(propValue);
const [isDirty, setIsDirty] = useState(false);
const isSaving = elementId ? elementOps.isSaving(elementId) : false;

useEffect(() => {
  if (!isDirty && !isSaving) {
    setLocalValue(propValue);
  }
}, [propValue, isDirty, isSaving]);
```

This pattern:
- Buffers user input in local state
- Blocks prop syncs while editing (isDirty)
- Blocks prop syncs while saving (isSaving)
- Allows sync only when both flags are clear

### Redux Save State Management

The `elementOpsSlice` tracks saves across all components:

```typescript
interface ElementOpsState {
  savingElements: Set<string>;      // Which elements are saving
  saveErrors: Record<string, string>; // Error messages by element
  lastSaveTimestamp: Record<string, number>;
}
```

This centralized approach:
- Provides consistent isSaving state across all editors
- Prevents race conditions
- Enables optimistic updates
- Supports error recovery

## Common Pitfalls (Now Fixed)

### ❌ Old Problem: Race Condition
**Issue**: 500ms timeout cleared isSaving before SELECTION_CHANGED arrived (~20-50ms), causing props to overwrite user input.

**Fix**: Removed arbitrary timeout, use message-driven state updates via Redux.

### ❌ Old Problem: Stateless Parameter Editors
**Issue**: Parameter editors had no local state buffer, so any prop change immediately overwrote user input.

**Fix**: Created useParameterEditorState hook with local state buffering and isDirty/isSaving guards.

### ❌ Old Problem: Extension-Side Connector Filtering
**Issue**: outgoingConnectors sent separately created duplicate state and potential staleness bugs.

**Fix**: Moved filtering to React side using useMemo, single source of truth in referenceData.connectors.

## Related Documentation

- [Element Update Message Protocol](../element-update.md)
- [Selection Changed Message Flow](../../selection/selection-changed.md)
- [Redux State Management](../../../react/state-management.md)
- [Message Routing Architecture](../../01_message_protocol.md)

## Version History

- **v2.0** (Current): Redux-based save state management, React-side connector filtering
- **v1.0**: Local timeout-based save state (had race conditions)
