// ActionEditor.priority.test.tsx
//
// Verifies the Priority input on Seize / DelayWithResource action bodies:
// editing it commits the whole action with an integer `priority` (clamped
// 0..900, empty/NaN -> 0), and the collapsed summary row appends the
// priority only when it is greater than 0.
//
// Seize/DELAY_WITH_RESOURCE render the shared RequirementField, which reads
// its host accessor from RequirementFieldContext (see
// ActionEditor.name.test.tsx) — this file's renderActionEditor helper wraps
// every render in a minimal fake accessor so those bodies mount cleanly.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionEditor } from "../ActionEditor";
import { ActionType, type Action } from "@quodsi/lucid-shared";
import { RequirementFieldContext } from "quodsi_studio/platforms/shared";

function makeAccessor() {
  const snapshot = {
    modelDefinition: {
      resources: [{ id: "r1", name: "Operator" }],
      resourceRequirements: [
        {
          id: "r1",
          name: "Operator",
          rootClause: { id: "c", mode: "require_all", requests: [{ resourceId: "r1" }] },
        },
      ],
      activities: [],
    },
    saveStatus: "idle",
    saveError: null,
  };
  return {
    subscribe: () => () => {},
    getSnapshot: () => snapshot,
    updateShape: vi.fn(async () => {}),
    updateModel: vi.fn(async () => {}),
    flushModelImmediate: vi.fn(async () => {}),
  } as any;
}

function renderActionEditor({
  action,
  onChange = vi.fn(),
  expanded = true,
}: {
  action: Action;
  onChange?: (updatedAction: Action) => void;
  expanded?: boolean;
}) {
  render(
    <RequirementFieldContext.Provider value={makeAccessor()}>
      <ActionEditor
        action={action}
        index={0}
        expanded={expanded}
        onToggleExpand={() => {}}
        onDelete={() => {}}
        onChange={onChange}
      />
    </RequirementFieldContext.Provider>
  );
}

it("seize body shows a Priority input and commits the whole action with priority", () => {
  const onChange = vi.fn();
  renderActionEditor({
    action: { id: "a1", type: ActionType.SEIZE, resourceRequirementId: "r1", condition: null } as Action,
    onChange,
  });
  fireEvent.change(screen.getByLabelText("Seize priority"), { target: { value: "4" } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "a1", priority: 4 }));
});

it("seize priority clamps out-of-range and empty values to 0..900", () => {
  const onChange = vi.fn();
  renderActionEditor({
    action: { id: "a1", type: ActionType.SEIZE, resourceRequirementId: "r1", condition: null } as Action,
    onChange,
  });
  const input = screen.getByLabelText("Seize priority");
  fireEvent.change(input, { target: { value: "9001" } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ priority: 900 }));
  fireEvent.change(input, { target: { value: "" } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ priority: 0 }));
});

it("summary line shows priority when > 0", () => {
  renderActionEditor({
    action: {
      id: "a1",
      type: ActionType.SEIZE,
      resourceRequirementId: "r1",
      priority: 2,
      condition: null,
    } as Action,
  });
  expect(screen.getByText(/priority 2/)).toBeInTheDocument();
});

it("summary line omits priority when 0", () => {
  renderActionEditor({
    action: {
      id: "a1",
      type: ActionType.SEIZE,
      resourceRequirementId: "r1",
      priority: 0,
      condition: null,
    } as Action,
  });
  expect(screen.queryByText(/priority/)).not.toBeInTheDocument();
});

it("delay-with-resource body shows a Priority input and commits the whole action with priority", () => {
  const onChange = vi.fn();
  renderActionEditor({
    action: {
      id: "a2",
      type: ActionType.DELAY_WITH_RESOURCE,
      resourceRequirementId: "r1",
      duration: { value: 5, unit: "minutes" },
      condition: null,
    } as unknown as Action,
    onChange,
  });
  fireEvent.change(screen.getByLabelText("Seize priority"), { target: { value: "3" } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "a2", priority: 3 }));
});

it("delay-with-resource summary line shows priority after the (keep) suffix", () => {
  renderActionEditor({
    action: {
      id: "a2",
      type: ActionType.DELAY_WITH_RESOURCE,
      resourceRequirementId: "r1",
      keepResource: true,
      priority: 7,
      duration: { value: 5, unit: "minutes" },
      condition: null,
    } as unknown as Action,
  });
  expect(screen.getByText(/\(keep\) · priority 7/)).toBeInTheDocument();
});
