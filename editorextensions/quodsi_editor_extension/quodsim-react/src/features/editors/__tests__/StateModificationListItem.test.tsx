// @quodsi/lucid-shared (pulled in by StateModificationListItem.tsx) transitively
// loads shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ConnectorsEditor.test.tsx / ResourceEditor.levers.test.tsx.)
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen } from "@testing-library/react";
import StateModificationListItem from "../StateModificationListItem";
import { State, StateModification, StateOperation, StateType, ComponentType } from "@quodsi/lucid-shared";

describe("StateModificationListItem", () => {
  const state = new State("total_MODEL_1", "total", ComponentType.MODEL, StateType.NUMBER, 0);

  it("renders a literal value unchanged", () => {
    const mod = new StateModification("total_MODEL_1", StateOperation.ADD, 5);
    render(
      <StateModificationListItem modification={mod} state={state} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders the expression, not the literal value, when the modification carries an expression", () => {
    const mod = new StateModification("total_MODEL_1", StateOperation.ASSIGN, undefined, {
      expression: "qty * unit_price",
    });
    render(
      <StateModificationListItem modification={mod} state={state} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByText("qty * unit_price")).toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });
});
