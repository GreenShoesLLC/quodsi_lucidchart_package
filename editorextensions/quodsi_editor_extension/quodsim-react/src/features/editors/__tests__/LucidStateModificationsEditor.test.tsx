// LucidStateModificationsEditor.test.tsx
//
// Spec 2026-09-13 lucid-state-modifications-editor §1: Lucid's five
// state-modification mounts render the shared StateModificationsEditor through
// this wrapper -- the section title, Lucid's StateListManager converted to the
// shared State[], and "Go to Model Editor" as the shared States-tab link.
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ComponentType, State, StateListManager, StateType } from "@quodsi/lucid-shared";
import { LucidStateModificationsEditor } from "../LucidStateModificationsEditor";

const qty = new State("s-qty", "Qty", ComponentType.ENTITY, StateType.NUMBER, 0);

function statesWith(...states: State[]): StateListManager {
  const list = new StateListManager();
  states.forEach((s) => list.add(s));
  return list;
}

describe("LucidStateModificationsEditor", () => {
  it("renders the section title and description", () => {
    render(
      <LucidStateModificationsEditor
        title="State Modifications"
        description="Applied to each new entity"
        modifications={[]}
        onModificationsChange={vi.fn()}
        states={statesWith(qty)}
      />
    );
    expect(screen.getByText("State Modifications")).toBeInTheDocument();
    expect(screen.getByText("Applied to each new entity")).toBeInTheDocument();
  });

  it("hands Lucid's states to the shared dialog", () => {
    render(
      <LucidStateModificationsEditor
        title="State Modifications"
        modifications={[]}
        onModificationsChange={vi.fn()}
        states={statesWith(qty)}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Add modification" }));
    expect(screen.getByRole("option", { name: /Qty/ })).toBeInTheDocument();
  });

  it("links to the Model's States tab when Lucid can navigate there", () => {
    const onNavigateToModelEditor = vi.fn();
    render(
      <LucidStateModificationsEditor
        title="Initial State Modifications"
        modifications={[]}
        onModificationsChange={vi.fn()}
        states={statesWith()}
        onNavigateToModelEditor={onNavigateToModelEditor}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Define one on the States tab" }));
    expect(onNavigateToModelEditor).toHaveBeenCalledTimes(1);
  });

  it("names the States tab without a link when no navigation is passed", () => {
    render(
      <LucidStateModificationsEditor
        title="Initial State Modifications"
        modifications={[]}
        onModificationsChange={vi.fn()}
        states={statesWith()}
      />
    );
    expect(screen.queryByRole("button", { name: "Define one on the States tab" })).toBeNull();
    expect(
      screen.getByText("No states defined yet. Define one on the Model's States tab.")
    ).toBeInTheDocument();
  });
});
