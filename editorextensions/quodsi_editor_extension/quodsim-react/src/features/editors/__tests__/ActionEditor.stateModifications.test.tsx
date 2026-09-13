// ActionEditor.stateModifications.test.tsx
//
// Spec 2026-09-13 lucid-state-modifications-editor: an Assign action edits its
// modifications in the shared editor (through LucidStateModificationsEditor).
// Split, Create and Join use the identical mount and are covered by smoke.
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ActionEditor } from "../ActionEditor";
import {
  ActionType,
  ComponentType,
  State,
  StateListManager,
  StateModification,
  StateOperation,
  StateType,
  type Action,
} from "@quodsi/lucid-shared";
import { RequirementFieldContext, setView } from "quodsi_studio/platforms/shared";

function makeAccessor() {
  const snapshot = {
    modelDefinition: { resources: [], resourceRequirements: [], activities: [] },
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

const qty = new State("s-qty", "Qty", ComponentType.ENTITY, StateType.NUMBER, 0);
const existing = new StateModification(qty.id, StateOperation.ASSIGN, 3);
const assign = { id: "a1", type: ActionType.ASSIGN, modifications: [existing], condition: null } as unknown as Action;

function renderAssign() {
  const onChange = vi.fn();
  const states = new StateListManager();
  states.add(qty);
  render(
    <RequirementFieldContext.Provider value={makeAccessor()}>
      <ActionEditor
        action={assign}
        index={0}
        expanded
        onToggleExpand={() => {}}
        onDelete={() => {}}
        onChange={onChange}
        states={states}
        onNavigateToModelEditor={vi.fn()}
      />
    </RequirementFieldContext.Provider>
  );
  return onChange;
}

const dialog = () => screen.getByText("Add State Modification").parentElement as HTMLElement;

beforeEach(() => { localStorage.clear(); setView("intermediate"); });
afterEach(() => setView("basic"));

describe("ActionEditor — an Assign action edits its modifications in the shared editor", () => {
  it("adds a modification through the shared dialog", () => {
    const onChange = renderAssign();
    fireEvent.click(screen.getByRole("button", { name: "Add modification" }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        modifications: [
          existing,
          expect.objectContaining({ stateId: "s-qty", operation: StateOperation.ASSIGN, value: 0 }),
        ],
      })
    );
  });

  it("deletes from the box under the row, and Cancel keeps the modification", async () => {
    const onChange = renderAssign();

    fireEvent.click(screen.getByLabelText("Delete modification on Qty"));
    fireEvent.click(within(screen.getByTestId("inline-delete-confirm")).getByRole("button", { name: "Cancel" }));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Delete modification on Qty"));
    fireEvent.click(screen.getByRole("button", { name: "Delete Modification" }));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ modifications: [] }))
    );
  });

  it("offers cross-component access", () => {
    renderAssign();
    fireEvent.click(screen.getByRole("button", { name: "Add modification" }));
    expect(screen.getByRole("button", { name: /Advanced: Cross-Component Access/ })).toBeInTheDocument();
  });
});
