# Conditional Action Guards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional `stateCondition` guard to every action — when present and false, the action is silently skipped.

**Architecture:** Add `state_condition` field to Python's base `Action` class and `stateCondition` to every TypeScript action interface. Guard check lives in the caller's execution loop (3 locations: activity_sim, BranchAction, LoopAction). Mirrors the existing Connector.state_condition pattern.

**Tech Stack:** Python (dataclasses, SimPy), TypeScript (interfaces), React (ActionEditor component)

**Design doc:** `docs/plans/2026-03-07-conditional-actions-design.md`

---

### Task 1: Python — Add `state_condition` to base Action class

**Files:**
- Modify: `quodsim/quodsim/model_definition/actions/action.py`

**Step 1: Modify the base Action class**

Change `Action` from a pure ABC to a dataclass ABC with an optional `state_condition` field:

```python
"""
Base class for all actions in the Action System.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Generator as PyGenerator, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .action_context import ActionContext
    from ..state_condition import StateCondition


@dataclass
class Action(ABC):
    """
    Base class for all actions - both primitive and composite.

    All actions implement execute() which yields SimPy events as needed.

    Attributes:
        state_condition: Optional guard condition. When set, the action is
            only executed if the condition evaluates to True against the
            entity's state. Mirrors Connector.state_condition.
    """

    state_condition: Optional["StateCondition"] = field(default=None)

    @abstractmethod
    def execute(self, context: "ActionContext") -> PyGenerator:
        """
        Execute this action.

        Args:
            context: Provides access to entity, model, resource tracking

        Yields:
            SimPy events for operations that require simulation time
            (e.g., resource seizure, delays)
        """
        pass
```

**Step 2: Verify all 12 action subclasses still work**

Run: `cd quodsim && python -c "from quodsim.model_definition.actions import *; print('All actions imported OK')"`

Expected: "All actions imported OK" — since `state_condition` has a default (`None`), no subclass needs changes.

**Step 3: Commit**

```bash
git add quodsim/quodsim/model_definition/actions/action.py
git commit -m "feat: add state_condition field to base Action class"
```

---

### Task 2: Python — Add guard check in activity_sim.py

**Files:**
- Modify: `quodsim/quodsim/simulation/activity/activity_sim.py:283-284`

**Step 1: Write the failing test**

Create `quodsim/tests/sim_tests/action_tests/test_action_state_condition.py`:

```python
"""Tests for optional state_condition guard on actions."""

import unittest
from unittest.mock import MagicMock, patch
from quodsim.model_definition.actions import (
    DelayAction, AssignAction, DisposeAction, ActionContext
)
from quodsim.model_definition.state_condition import StateCondition
from quodsim.enums.state_comparison import StateComparison
from quodsim.model_definition.duration import Duration


class TestActionStateConditionGuard(unittest.TestCase):
    """Test that state_condition on actions gates execution."""

    def test_action_without_condition_executes(self):
        """Action with no state_condition should always execute."""
        action = AssignAction()
        self.assertIsNone(action.state_condition)

    def test_action_with_condition_field(self):
        """Action should accept state_condition in constructor."""
        condition = StateCondition(
            state_name="color",
            comparison=StateComparison.EQUAL,
            value="red"
        )
        action = AssignAction(state_condition=condition)
        self.assertIsNotNone(action.state_condition)
        self.assertEqual(action.state_condition.state_name, "color")

    def test_delay_action_with_condition(self):
        """DelayAction should accept state_condition."""
        condition = StateCondition(
            state_name="priority",
            comparison=StateComparison.GREATER_EQUAL,
            value=5
        )
        action = DelayAction(state_condition=condition)
        self.assertEqual(action.state_condition.state_name, "priority")

    def test_dispose_action_with_condition(self):
        """DisposeAction should accept state_condition."""
        condition = StateCondition(
            state_name="is_defective",
            comparison=StateComparison.EQUAL,
            value=True
        )
        action = DisposeAction(state_condition=condition)
        self.assertEqual(action.state_condition.state_name, "is_defective")


if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run test to verify it passes (this tests the Task 1 changes)**

Run: `cd quodsim && python -m unittest tests.sim_tests.action_tests.test_action_state_condition -v`

Expected: 4 tests PASS

**Step 3: Add guard check in activity_sim.py**

In `quodsim/quodsim/simulation/activity/activity_sim.py`, find the action execution loop in `yield_activity_op_steps` (~line 283-284). Change:

```python
            else:
                yield from action.execute(context)
```

To:

```python
            else:
                # Check optional state_condition guard
                if action.state_condition is not None:
                    if not context.evaluate_condition(action.state_condition):
                        continue
                yield from action.execute(context)
```

**Step 4: Commit**

```bash
git add quodsim/quodsim/simulation/activity/activity_sim.py
git add quodsim/tests/sim_tests/action_tests/test_action_state_condition.py
git commit -m "feat: add state_condition guard check in activity action loop"
```

---

### Task 3: Python — Add guard check in BranchAction and LoopAction

**Files:**
- Modify: `quodsim/quodsim/model_definition/actions/branch_action.py:69-80`
- Modify: `quodsim/quodsim/model_definition/actions/loop_action.py:74-79`

**Step 1: Add guard to BranchAction**

In `branch_action.py`, in `execute()`, change both the if_true and if_false loops. Replace:

```python
        if condition_result:
            for action in self.if_true:
                yield from action.execute(context)
                # Check if entity was disposed
                if context.entity_disposed:
                    return
        else:
            for action in self.if_false:
                yield from action.execute(context)
                # Check if entity was disposed
                if context.entity_disposed:
                    return
```

With:

```python
        if condition_result:
            for action in self.if_true:
                if action.state_condition is not None:
                    if not context.evaluate_condition(action.state_condition):
                        continue
                yield from action.execute(context)
                if context.entity_disposed:
                    return
        else:
            for action in self.if_false:
                if action.state_condition is not None:
                    if not context.evaluate_condition(action.state_condition):
                        continue
                yield from action.execute(context)
                if context.entity_disposed:
                    return
```

**Step 2: Add guard to LoopAction**

In `loop_action.py`, in `execute()`, change the inner loop. Replace:

```python
                for action in self.actions:
                    yield from action.execute(context)
                    # Check if entity was disposed
                    if context.entity_disposed:
                        return
```

With:

```python
                for action in self.actions:
                    if action.state_condition is not None:
                        if not context.evaluate_condition(action.state_condition):
                            continue
                    yield from action.execute(context)
                    if context.entity_disposed:
                        return
```

**Step 3: Run existing action tests to verify no regressions**

Run: `cd quodsim && python -m unittest discover tests/sim_tests/action_tests -v`

Expected: All existing tests PASS

**Step 4: Commit**

```bash
git add quodsim/quodsim/model_definition/actions/branch_action.py
git add quodsim/quodsim/model_definition/actions/loop_action.py
git commit -m "feat: add state_condition guard check in BranchAction and LoopAction nested loops"
```

---

### Task 4: Python — Add deserialization of state_condition in JSON reader

**Files:**
- Modify: `quodsim/quodsim/readers/lucid_model_definition_json_reader.py:1566`

**Step 1: Add state_condition parsing after action construction**

In `_create_actions()`, find the line `actions.append(action)` (~line 1566). Insert the state_condition parsing just before it:

```python
                # Parse optional state_condition guard (mirrors Connector pattern)
                sc_data = action_data.get("stateCondition") or action_data.get("state_condition")
                if sc_data:
                    normalized = {
                        "state_name": sc_data.get("stateName") or sc_data.get("state_name"),
                        "comparison": sc_data.get("comparison"),
                        "value": sc_data.get("value"),
                    }
                    action.state_condition = StateCondition.from_dict(normalized)

                actions.append(action)
```

Also add `StateCondition` to the imports at the top of the file. Find the existing imports from `..model_definition` and add:

```python
from ..model_definition.state_condition import StateCondition
```

Check if `StateCondition` is already imported (it's used for BranchAction deserialization ~line 1546). If already imported, skip.

**Step 2: Add a deserialization test**

Add to `tests/sim_tests/action_tests/test_action_state_condition.py`:

```python
class TestActionStateConditionDeserialization(unittest.TestCase):
    """Test JSON deserialization of state_condition on actions."""

    def test_delay_action_with_state_condition_json(self):
        """state_condition should deserialize from JSON action data."""
        from quodsim.readers.lucid_model_definition_json_reader import LucidModelDefinitionJsonReader
        import json

        reader = LucidModelDefinitionJsonReader.__new__(LucidModelDefinitionJsonReader)
        reader.logger = MagicMock()

        actions_data = [
            {
                "actionType": "DELAY",
                "duration": {
                    "durationLength": 10.0,
                    "durationPeriodUnit": "MINUTES",
                    "distribution": {"distributionType": "constant", "parameters": {"constant": 10.0}}
                },
                "stateCondition": {
                    "stateName": "priority",
                    "comparison": ">=",
                    "value": 5
                }
            }
        ]

        actions = reader._create_actions(actions_data)
        self.assertEqual(len(actions), 1)
        self.assertIsNotNone(actions[0].state_condition)
        self.assertEqual(actions[0].state_condition.state_name, "priority")
        self.assertEqual(actions[0].state_condition.value, 5)

    def test_action_without_state_condition_json(self):
        """Actions without stateCondition should have None."""
        from quodsim.readers.lucid_model_definition_json_reader import LucidModelDefinitionJsonReader

        reader = LucidModelDefinitionJsonReader.__new__(LucidModelDefinitionJsonReader)
        reader.logger = MagicMock()

        actions_data = [
            {
                "actionType": "DISPOSE"
            }
        ]

        actions = reader._create_actions(actions_data)
        self.assertEqual(len(actions), 1)
        self.assertIsNone(actions[0].state_condition)
```

**Step 3: Run the deserialization tests**

Run: `cd quodsim && python -m unittest tests.sim_tests.action_tests.test_action_state_condition -v`

Expected: All tests PASS

**Step 4: Commit**

```bash
git add quodsim/quodsim/readers/lucid_model_definition_json_reader.py
git add quodsim/tests/sim_tests/action_tests/test_action_state_condition.py
git commit -m "feat: deserialize state_condition from JSON action data"
```

---

### Task 5: Python — Full integration test with simulation

**Files:**
- Modify: `quodsim/tests/sim_tests/action_tests/test_action_state_condition.py`

**Step 1: Write an integration test**

Add a test that builds a minimal model with an action guarded by a state_condition and runs it through the simulation. Use one of the existing test model patterns as a template. Look at `tests/sim_tests/action_tests/` for examples of how other action tests build models.

The test should verify:
- An entity with state matching the condition: action executes (e.g., delay occurs)
- An entity with state NOT matching the condition: action is skipped (e.g., no delay)

This test verifies the end-to-end flow through `activity_sim.yield_activity_op_steps()`.

**Step 2: Run the integration test**

Run: `cd quodsim && python -m unittest tests.sim_tests.action_tests.test_action_state_condition -v`

Expected: All tests PASS

**Step 3: Run full test suite to check for regressions**

Run: `cd quodsim && python -m unittest discover tests -v`

Expected: No new failures

**Step 4: Commit**

```bash
git add quodsim/tests/sim_tests/action_tests/test_action_state_condition.py
git commit -m "test: add integration test for state_condition guard in simulation"
```

---

### Task 6: TypeScript — Add `stateCondition` to all action interfaces

**Files:**
- Modify: `shared/src/types/elements/actions/AssignAction.ts`
- Modify: `shared/src/types/elements/actions/SeizeAction.ts`
- Modify: `shared/src/types/elements/actions/ReleaseAction.ts`
- Modify: `shared/src/types/elements/actions/DelayAction.ts`
- Modify: `shared/src/types/elements/actions/DelayWithResourceAction.ts`
- Modify: `shared/src/types/elements/actions/SplitAction.ts`
- Modify: `shared/src/types/elements/actions/CreateAction.ts`
- Modify: `shared/src/types/elements/actions/DisposeAction.ts`
- Modify: `shared/src/types/elements/actions/JoinAction.ts`
- Modify: `shared/src/types/elements/actions/LoopAction.ts`
- Modify: `shared/src/types/elements/actions/BranchAction.ts`

**Step 1: Add `stateCondition` field to every action interface**

For each action interface, add the optional field. Example for `DelayAction.ts`:

```typescript
import { ActionType } from './ActionType';
import { Duration } from '../Duration';
import { StateCondition } from '../StateCondition';

export interface DelayAction {
    actionType: ActionType.DELAY;
    duration: Duration;
    stateCondition?: StateCondition | null;
}
```

For `DisposeAction.ts` (simplest case):

```typescript
import { ActionType } from './ActionType';
import { StateCondition } from '../StateCondition';

export interface DisposeAction {
    actionType: ActionType.DISPOSE;
    stateCondition?: StateCondition | null;
}
```

Apply the same pattern to all 11 action interfaces. Each needs:
1. Import `StateCondition` from `'../StateCondition'`
2. Add `stateCondition?: StateCondition | null;` to the interface

**Step 2: Update factory functions to accept optional stateCondition**

For each factory function, add the parameter. Example for `createDelayAction`:

```typescript
export function createDelayAction(duration: Duration, stateCondition?: StateCondition | null): DelayAction {
    return {
        actionType: ActionType.DELAY,
        duration,
        stateCondition: stateCondition ?? null
    };
}
```

For `createDisposeAction`:

```typescript
export function createDisposeAction(stateCondition?: StateCondition | null): DisposeAction {
    return {
        actionType: ActionType.DISPOSE,
        stateCondition: stateCondition ?? null
    };
}
```

For actions with `options` pattern (like `createBranchAction`, `createJoinAction`, etc.), the `stateCondition` is already covered by `Partial<Omit<BranchAction, 'actionType'>>` — no parameter change needed, just add the field to the interface.

For actions with positional parameters, add `stateCondition` as the last optional parameter.

**Step 3: Update `createDefaultAction` in `index.ts`**

No changes needed — `createDefaultAction` calls factory functions without `stateCondition`, which defaults to `null`.

**Step 4: Build shared library**

Run: `cd quodsi_lucidchart_package/shared && npm run build`

Expected: Clean build, no errors

**Step 5: Commit**

```bash
git add shared/src/types/elements/actions/
git commit -m "feat: add stateCondition field to all TypeScript action interfaces"
```

---

### Task 7: TypeScript — Add `stateCondition` to serialization interfaces

**Files:**
- Modify: `shared/src/serialization/interfaces/ISerializedAction.ts`

**Step 1: Add `stateCondition` to `ISerializedActionBase`**

```typescript
export interface ISerializedActionBase {
    actionType: SerializedActionType;
    stateCondition?: any | null;
}
```

Since all specific serialized action interfaces extend `ISerializedActionBase`, they all inherit the field.

**Step 2: Build shared library**

Run: `cd quodsi_lucidchart_package/shared && npm run build`

Expected: Clean build

**Step 3: Commit**

```bash
git add shared/src/serialization/interfaces/ISerializedAction.ts
git commit -m "feat: add stateCondition to ISerializedActionBase"
```

---

### Task 8: TypeScript — Serialize/deserialize stateCondition

**Files:**
- Modify: `shared/src/serialization/BaseModelDefinitionSerializer.ts`

**Step 1: Add stateCondition serialization**

In `serializeAction()` method, after the switch statement builds the serialized action but before the return/catch, add stateCondition serialization. Find the pattern — each case in the switch returns immediately, so we need to capture the result first.

Alternatively, since each `case` returns directly, add `stateCondition` to each returned object. The cleanest approach: refactor to capture the result, then add `stateCondition` before returning.

Replace the try block structure in `serializeAction()` (~lines 454-563):

After the switch statement, before returning, the approach needs to handle that each case returns directly. The simplest change: after building each serialized object in each case, add `stateCondition` if present on the action.

Since every case already returns an object literal, add to each case:

```typescript
...(action.stateCondition ? { stateCondition: (action as any).stateCondition.toJSON ? (action as any).stateCondition.toJSON() : action.stateCondition } : {})
```

A cleaner approach: refactor `serializeAction` to capture the result in a variable, then conditionally add `stateCondition`:

```typescript
protected serializeAction(action: Action): ISerializedAction {
    try {
        let serialized: ISerializedAction;

        switch (action.actionType) {
            case ActionType.ASSIGN:
                serialized = {
                    actionType: ActionType.ASSIGN,
                    modifications: (action as AssignAction).modifications.map(m => this.serializeModification(m))
                };
                break;
            // ... all other cases changed from `return` to `serialized = ...; break;`
        }

        // Add optional stateCondition guard
        if ((action as any).stateCondition) {
            const sc = (action as any).stateCondition;
            (serialized as any).stateCondition = typeof sc.toJSON === 'function' ? sc.toJSON() : sc;
        }

        return serialized;
    } catch (error) {
        throw new SerializationError('Action', 'Failed to serialize action', error instanceof Error ? error : undefined);
    }
}
```

Convert each `return { ... }` to `serialized = { ... }; break;` in the switch statement.

**Step 2: Build shared library**

Run: `cd quodsi_lucidchart_package/shared && npm run build`

Expected: Clean build

**Step 3: Commit**

```bash
git add shared/src/serialization/BaseModelDefinitionSerializer.ts
git commit -m "feat: serialize stateCondition in action serializer"
```

---

### Task 9: TypeScript — Tests for stateCondition serialization

**Files:**
- Create: `shared/tests/types/elements/actions/ActionStateCondition.test.ts`

**Step 1: Write tests**

```typescript
import { ActionType } from "../../../../src/types/elements/actions/ActionType";
import { createDelayAction } from "../../../../src/types/elements/actions/DelayAction";
import { createDisposeAction } from "../../../../src/types/elements/actions/DisposeAction";
import { createSeizeAction } from "../../../../src/types/elements/actions/SeizeAction";
import { createBranchAction } from "../../../../src/types/elements/actions/BranchAction";
import { StateCondition } from "../../../../src/types/elements/StateCondition";
import { StateComparison } from "../../../../src/types/elements/StateComparison";
import { Duration } from "../../../../src/types/elements/Duration";

describe("Action stateCondition field", () => {
  const condition = new StateCondition("color", StateComparison.EQUAL, "red");

  it("factory defaults to null when not provided", () => {
    const action = createDelayAction(new Duration());
    expect(action.stateCondition).toBeNull();
  });

  it("factory accepts stateCondition parameter", () => {
    const action = createDelayAction(new Duration(), condition);
    expect(action.stateCondition).toBeDefined();
    expect(action.stateCondition!.stateName).toBe("color");
    expect(action.stateCondition!.value).toBe("red");
  });

  it("DisposeAction accepts stateCondition", () => {
    const action = createDisposeAction(condition);
    expect(action.stateCondition!.stateName).toBe("color");
  });

  it("SeizeAction accepts stateCondition", () => {
    const action = createSeizeAction("req_1", condition);
    expect(action.stateCondition!.stateName).toBe("color");
  });

  it("BranchAction accepts stateCondition via options", () => {
    const action = createBranchAction({ stateCondition: condition });
    expect(action.stateCondition!.stateName).toBe("color");
  });

  it("stateCondition serializes to JSON", () => {
    const action = createDelayAction(new Duration(), condition);
    const json = action.stateCondition!.toJSON();
    expect(json).toEqual({
      stateName: "color",
      comparison: "==",
      value: "red"
    });
  });
});
```

**Step 2: Run tests**

Run: `cd quodsi_lucidchart_package/shared && npx jest tests/types/elements/actions/ActionStateCondition.test.ts --no-coverage`

Expected: All tests PASS

**Step 3: Commit**

```bash
git add shared/tests/types/elements/actions/ActionStateCondition.test.ts
git commit -m "test: add tests for stateCondition on TypeScript actions"
```

---

### Task 10: React UI — Add collapsible condition section to ActionEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActionEditor.tsx`

**Step 1: Add a reusable condition editor section**

Add a new component or section within `ActionEditor.tsx` that renders the collapsible state condition guard. This should appear at the top of every action's expanded editor, above the action-specific fields.

The pattern to follow is the existing BranchAction condition editor (lines 1079-1208 of ActionEditor.tsx), but wrapped in a collapsible container:

- Use a `<details>` element or a toggle state for collapse/expand
- Collapsed: show "No condition (always runs)" or "When: {stateName} {comparison} {value}"
- Expanded: show the same 3-field row (state dropdown, comparison dropdown, value input)
- Include a "Clear" button to remove the condition

Extract the condition editing logic into a helper function or inline it at the top of the `renderExpandedContent` method (or equivalent), before the `switch (action.actionType)`.

**Key implementation details:**

1. The `states` prop (`StateListManager`) is already passed to ActionEditor — use it for the state dropdown
2. When the user sets/updates/clears the condition, call `onChange({ ...action, stateCondition: updatedCondition })`
3. For BranchAction, label this section "Run condition" or "Skip unless" to distinguish from the existing "Branch condition"
4. Use `StateCondition` class from `@quodsi/shared` for creating/updating conditions (same as BranchAction editor does)

**Step 2: Test manually**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm start`

Verify:
- Every action type shows the collapsible condition section when expanded
- Condition defaults to collapsed showing "No condition (always runs)"
- Expanding shows state/comparison/value dropdowns
- Setting a condition shows the summary when collapsed
- Clearing restores "No condition"
- BranchAction shows both "Run condition" (guard) and "Branch condition" (existing)

**Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActionEditor.tsx
git commit -m "feat: add collapsible state condition guard UI to ActionEditor"
```

---

### Task 11: Build and verify end-to-end

**Step 1: Build shared library**

Run: `cd quodsi_lucidchart_package/shared && npm run build`

Expected: Clean build

**Step 2: Run all shared library tests**

Run: `cd quodsi_lucidchart_package/shared && npm test -- --no-coverage`

Expected: No new failures

**Step 3: Run all Python tests**

Run: `cd quodsim && python -m unittest discover tests -v`

Expected: No new failures

**Step 4: Commit any remaining changes**

```bash
git commit -m "chore: verify end-to-end build and tests pass"
```
