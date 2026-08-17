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
  const literalModification = new StateModification("total_MODEL_1", StateOperation.ASSIGN, 0);
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
      expect.objectContaining({ expression: "qty * unit_price", value: undefined })
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
      StateOperation.ASSIGN,
      "A"
    );
    render(<StateModificationFormDialog {...baseProps} modification={categoryModification} />);
    expect(screen.queryByLabelText("Expression")).not.toBeInTheDocument();
  });

  it("loads an existing expression back into expression mode", () => {
    const expressionModification = new StateModification(
      "total_MODEL_1",
      StateOperation.ASSIGN,
      undefined,
      { expression: "qty * unit_price" }
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

  // Fix round 2, Finding 4: asserting only that the expression input is gone
  // right after the switch to SAMPLE proves nothing — the render gate is
  // `operation !== SAMPLE && operandMode === "expression"`, and its first
  // half alone hides the input the instant `operation` flips. That version of
  // this test passed identically with the reset effect deleted. Switching
  // BACK to a non-SAMPLE operation re-satisfies the first half, so the input
  // reappears if and only if operandMode is still "expression" — which is
  // what actually exercises the effect.
  it("resets to literal mode when the operation is switched to Sample from Distribution, and the reset survives switching back", () => {
    render(<StateModificationFormDialog {...baseProps} onSave={jest.fn()} />);
    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "qty * unit_price" },
    });

    // Operation <select> is the second combobox (State is first).
    const operationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(operationSelect, { target: { value: StateOperation.SAMPLE } });

    expect(screen.queryByLabelText("Expression value")).not.toBeInTheDocument();

    // Back to a non-SAMPLE operation: the mode must really have reset, not
    // merely been masked — no expression input, and the toggle sitting on
    // "Value" rather than restored with the stale expression text.
    fireEvent.change(screen.getAllByRole("combobox")[1], {
      target: { value: StateOperation.ASSIGN },
    });

    expect(screen.queryByLabelText("Expression value")).not.toBeInTheDocument();
    expect((screen.getByLabelText("Expression") as HTMLInputElement).checked).toBe(false);
  });

  // Fix round 2, Finding 1: a leading space or tab is an IndentationError to
  // the engine's `eval`-mode parse (E_SYNTAX), so an untrimmed
  // `" qty * unit_price"` produced a green dialog and a run the engine
  // refuses. The dialog trims on the way in AND on the way out, so pasting
  // padded text just works.
  it("trims surrounding whitespace off a pasted expression rather than saving it verbatim", () => {
    const onSave = jest.fn();
    render(<StateModificationFormDialog {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText("Expression"));
    fireEvent.change(screen.getByLabelText("Expression value"), {
      target: { value: "  qty * unit_price  " },
    });

    expect(screen.queryByText(/may not begin with a space or tab/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ expression: "qty * unit_price", value: undefined })
    );
  });
});
