// @quodsi/lucid-shared (pulled in by StateModificationFormDialog.tsx) transitively
// loads shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ConnectorsEditor.test.tsx / ResourceEditor.levers.test.tsx.)
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StateModificationFormDialog from "../StateModificationFormDialog";
import {
  StateListManager,
  State,
  StateModification,
  StateOperation,
  StateType,
  ComponentType,
} from "@quodsi/lucid-shared";

function buildStates(): StateListManager {
  const states = new StateListManager();
  states.add(new State("total_MODEL_1", "total", ComponentType.MODEL, StateType.NUMBER, 0));
  states.add(new State("qty_ENTITY_1", "qty", ComponentType.ENTITY, StateType.NUMBER, 0));
  states.add(new State("unit_price_ENTITY_1", "unit_price", ComponentType.ENTITY, StateType.NUMBER, 0));
  states.add(
    new State("status_MODEL_1", "status", ComponentType.MODEL, StateType.CATEGORY, "A", {
      categoryValues: ["A", "B"],
    })
  );
  states.add(
    new State("resource_level_RESOURCE_1", "resource_level", ComponentType.RESOURCE, StateType.NUMBER, 0)
  );
  return states;
}

describe("StateModificationFormDialog — expression mode", () => {
  const states = buildStates();
  const literalModification = new StateModification("total_MODEL_1", "total", StateOperation.ASSIGN, 0);
  const baseProps = {
    isOpen: true,
    modification: literalModification,
    states,
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  it("saves an expression when expression mode is selected", () => {
    const onSave = jest.fn();
    render(<StateModificationFormDialog {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "qty * unit_price" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ valueExpression: "qty * unit_price", value: undefined })
    );
  });

  it("blocks saving an invalid expression and shows the reason", () => {
    const onSave = jest.fn();
    render(<StateModificationFormDialog {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "qty.value" },
    });

    expect(screen.getByText(/attribute access/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects an expression referencing an unknown state", () => {
    render(<StateModificationFormDialog {...baseProps} />);
    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "qty * nope" },
    });
    expect(screen.getByText(/unknown state 'nope'/i)).toBeInTheDocument();
  });

  it("hides expression mode for a CATEGORY target state", () => {
    const categoryModification = new StateModification(
      "status_MODEL_1",
      "status",
      StateOperation.ASSIGN,
      "A"
    );
    render(<StateModificationFormDialog {...baseProps} modification={categoryModification} />);
    expect(screen.queryByLabelText("Expression")).not.toBeInTheDocument();
  });

  it("loads an existing expression back into expression mode", () => {
    const expressionModification = new StateModification(
      "total_MODEL_1",
      "total",
      StateOperation.ASSIGN,
      undefined,
      { valueExpression: "qty * unit_price" }
    );
    render(<StateModificationFormDialog {...baseProps} modification={expressionModification} />);
    expect(
      (screen.getByLabelText("Expression value") as HTMLInputElement).value
    ).toBe("qty * unit_price");
  });

  it("rejects an expression referencing a RESOURCE-scoped state", () => {
    render(<StateModificationFormDialog {...baseProps} />);
    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "qty * resource_level" },
    });
    expect(
      screen.getByText(/only entity and model states can be read in an expression/i)
    ).toBeInTheDocument();
  });

  it("reports the arity error, not the generic type-mismatch message, for min(qty)", () => {
    render(<StateModificationFormDialog {...baseProps} />);
    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "min(qty)" },
    });
    expect(
      screen.getByText(/min\(\) takes at least 2 arguments, got 1/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/mixes incompatible types/i)).not.toBeInTheDocument();
  });

  it("resets to literal mode when switching to a CATEGORY state while in expression mode, so Save cannot emit a valueExpression the target cannot accept", () => {
    render(<StateModificationFormDialog {...baseProps} onSave={jest.fn()} />);
    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "qty * unit_price" },
    });

    // The State <select> is the first combobox in the dialog.
    const stateSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(stateSelect, { target: { value: "status_MODEL_1" } });

    expect(screen.queryByLabelText("Expression")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Expression value")).not.toBeInTheDocument();
  });

  it("resets to literal mode when the operation is switched to Sample from Distribution", () => {
    render(<StateModificationFormDialog {...baseProps} onSave={jest.fn()} />);
    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "qty * unit_price" },
    });

    // Operation <select> is the second combobox (State is first).
    const operationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(operationSelect, { target: { value: StateOperation.SAMPLE } });

    expect(screen.queryByLabelText("Expression value")).not.toBeInTheDocument();
  });
});
