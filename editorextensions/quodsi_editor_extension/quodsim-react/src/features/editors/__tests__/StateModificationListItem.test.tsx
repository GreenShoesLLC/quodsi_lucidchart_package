import React from "react";
import { render, screen } from "@testing-library/react";
import StateModificationListItem from "../StateModificationListItem";
import { State, StateModification, StateOperation, StateType, ComponentType } from "@quodsi/lucid-shared";

describe("StateModificationListItem", () => {
  const state = new State("total_MODEL_1", "total", ComponentType.MODEL, StateType.NUMBER, 0);

  it("renders a literal value unchanged", () => {
    const mod = new StateModification("total_MODEL_1", StateOperation.ADD, 5);
    render(
      <StateModificationListItem modification={mod} state={state} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders the expression, not the literal value, when the modification carries an expression", () => {
    const mod = new StateModification("total_MODEL_1", StateOperation.ASSIGN, undefined, {
      expression: "qty * unit_price",
    });
    render(
      <StateModificationListItem modification={mod} state={state} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText("qty * unit_price")).toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });
});
