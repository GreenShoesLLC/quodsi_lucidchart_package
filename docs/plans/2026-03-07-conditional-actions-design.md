# Conditional Action Guards — Design Document

## Context

The Action system lets users define behavior on Activities as a sequence of composable actions (Delay, Seize, Release, Assign, Branch, Loop, etc.). Currently, there is no way to conditionally skip an individual action based on entity state — the only option is to wrap actions in a BranchAction with if-true/if-false branches, which is heavyweight for the common case of "skip this one action if condition X is false."

**Goal**: Add an optional `stateCondition` guard to every action. When present and the condition evaluates to `false` against the current entity's state, the action is silently skipped (pure skip — no events, no metrics). This mirrors how `Connector.state_condition` already works.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Skip behavior | Pure skip — silently bypassed | Simplest; no events or metrics recorded |
| Which actions get it | All 12 action types, no exceptions | Uniform — even BranchAction can have a guard |
| State evaluation target | Entity state (via `context.evaluate_condition`) | Matches Connector pattern |
| Field name | `stateCondition` (TS) / `state_condition` (Python) | Matches Connector naming convention |
| Where guard is checked | Caller's loop (Approach A) | Single point of change; actions don't know about their own guard |
| UI presentation | Collapsible section, collapsed by default | Non-intrusive for simple actions |

---

## 1. Data Model Changes

### Python — Base `Action` class

**File**: `quodsim/model_definition/actions/action.py`

Change `Action` from a pure ABC to a dataclass ABC with one optional field:

```python
@dataclass
class Action(ABC):
    state_condition: Optional["StateCondition"] = field(default=None)

    @abstractmethod
    def execute(self, context: "ActionContext") -> PyGenerator:
        pass
```

All 12 action subclasses already use `@dataclass` and inherit from `Action`. Since `state_condition` has a default (`None`), it won't conflict with existing required fields on subclasses. The field is inherited automatically — no per-action changes needed.

### TypeScript — Serialization Interface

**File**: `shared/src/serialization/interfaces/ISerializedAction.ts`

```typescript
export interface ISerializedActionBase {
    actionType: SerializedActionType;
    stateCondition?: any | null;
}
```

### TypeScript — Action Interfaces

**Files**: `shared/src/types/elements/actions/*.ts`

Add to every action interface:

```typescript
stateCondition?: StateCondition | null;
```

Update every factory function (`createDelayAction`, `createSeizeAction`, etc.) to accept an optional `stateCondition` parameter, defaulting to `null`.

### Backward Compatibility

Existing models without `stateCondition` on actions deserialize with `null`/`None` — no migration needed.

---

## 2. Runtime Execution Changes

### Primary guard — `activity_sim.py`

**File**: `quodsim/simulation/activity/activity_sim.py` (~line 284)

```python
# Before:
yield from action.execute(context)

# After:
if action.state_condition is not None:
    if not context.evaluate_condition(action.state_condition):
        continue
yield from action.execute(context)
```

### Nested action guards — BranchAction and LoopAction

Both have their own nested action loops. Same 2-line guard added before each `yield from action.execute(context)`:

**BranchAction** (`quodsim/model_definition/actions/branch_action.py`):
```python
for action in self.if_true:  # and if_false
    if action.state_condition is not None:
        if not context.evaluate_condition(action.state_condition):
            continue
    yield from action.execute(context)
    if context.entity_disposed:
        return
```

**LoopAction** (`quodsim/model_definition/actions/loop_action.py`):
```python
for action in self.actions:
    if action.state_condition is not None:
        if not context.evaluate_condition(action.state_condition):
            continue
    yield from action.execute(context)
    if context.entity_disposed:
        return
```

### DelayWithResourceAction

The guard on `DelayWithResourceAction` is checked by the caller (activity_sim.py). When the condition is false, the entire composite (seize->delay->release) is skipped. No internal changes needed.

### Interrupt Resume

The `_resume_action_index` in `activity_sim.py` tracks which action to resume from after MTBF/MTTR interrupt. Since a skipped action uses `continue`, the index still advances correctly — no special handling needed.

---

## 3. Deserialization Changes

### Python — JSON Reader

**File**: `quodsim/readers/lucid_model_definition_json_reader.py`

After each action is constructed in `_create_actions()`, parse the optional `stateCondition` — one location, after the if/elif chain, before `actions.append(action)`:

```python
# After action is created, before appending:
condition_data = action_data.get("stateCondition") or action_data.get("state_condition")
if condition_data:
    normalized = {
        "state_name": condition_data.get("stateName") or condition_data.get("state_name"),
        "comparison": condition_data.get("comparison"),
        "value": condition_data.get("value"),
    }
    action.state_condition = StateCondition.from_dict(normalized)

actions.append(action)
```

This is the same pattern already used for BranchAction's `condition` (lines 1537-1546).

### TypeScript — Serializer

**File**: `shared/src/serialization/BaseModelDefinitionSerializer.ts`

Add `stateCondition` serialization once (not per-type), after the switch statement:

```typescript
if (action.stateCondition) {
    serialized.stateCondition = action.stateCondition.toJSON();
}
```

Action deserialization: after constructing the action object, check for `stateCondition` in the data and call `StateCondition.fromJSON()`.

---

## 4. UI Changes

### ActionEditor.tsx

Add a collapsible "Condition" section to every action's expanded editor:

- **Collapsed by default**, showing "No condition (always runs)" when empty
- When expanded, shows the same state condition editor used in BranchAction: state name dropdown, comparison operator dropdown, value input
- Populated from the `states` prop (`StateListManager`) already passed to ActionEditor
- When a condition is set, collapsed summary shows the condition description (e.g., "When: ColorState == red")
- Clearing the condition sets `stateCondition` back to `null`

**Placement**: At the **top** of the expanded action editor, above action-specific fields. This matches the mental model of "check condition first, then do the action."

**BranchAction distinction**: BranchAction has two condition-related fields:
- **"Run condition"** (or "Skip unless") — the new `stateCondition` guard, controls whether the branch runs at all
- **"Branch condition"** — the existing `condition` field for if-true/if-false evaluation

These are labeled distinctly in the UI to avoid confusion.

---

## 5. Testing

### Python unit tests

**New file**: `tests/sim_tests/action_tests/test_action_state_condition.py`

- Action with no `stateCondition` executes normally
- Action with `stateCondition` evaluating `true` executes normally
- Action with `stateCondition` evaluating `false` is skipped (no effect on entity)
- Guard works on nested actions inside LoopAction
- Guard works on nested actions inside BranchAction's if-true/if-false lists
- Guard on BranchAction itself skips the entire branch evaluation
- Guard on DelayWithResourceAction skips the full seize->delay->release
- Guard on DisposeAction: condition false = entity survives
- JSON deserialization with `stateCondition` on various action types round-trips correctly

### TypeScript tests

- Serialization round-trip: action with `stateCondition` serializes/deserializes correctly
- Factory functions: `stateCondition` defaults to `null` when not provided
- Factory functions: `stateCondition` is set when provided

### Existing tests

No changes — `stateCondition` defaults to `null`/`None`, so all existing models and tests behave identically.

---

## Summary of Changes

| Area | Files | Scope |
|------|-------|-------|
| Data model (Python) | `action.py` | Add `state_condition` field to base `Action` |
| Data model (TypeScript) | `ISerializedAction.ts`, all action `*.ts` files, factory functions | Add `stateCondition` field |
| Runtime (Python) | `activity_sim.py`, `branch_action.py`, `loop_action.py` | 3 guard check locations (2 lines each) |
| Deserialization (Python) | `lucid_model_definition_json_reader.py` | 1 location after action construction |
| Serialization (TypeScript) | `BaseModelDefinitionSerializer.ts` | Serialize/deserialize `stateCondition` |
| UI (React) | `ActionEditor.tsx` | Collapsible condition section at top of editor |
| Tests (Python) | New `test_action_state_condition.py` | Guard behavior across action types |
| Tests (TypeScript) | New test file | Serialization round-trip, factory defaults |
