// @quodsi/lucid-shared (pulled in by StatesEditor.tsx) transitively loads
// shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as StateModificationFormDialog.test.tsx.)
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StatesEditor from "../StatesEditor";
import {
  StateListManager,
  State,
  ComponentType,
  StateType,
  EditorReferenceData,
} from "@quodsi/lucid-shared";

function buildStates(): StateListManager {
  const states = new StateListManager();
  states.add(new State("unit_price_ENTITY_1", "unit_price", ComponentType.ENTITY, StateType.NUMBER, 0));
  return states;
}

// One activity action whose modification sets a DIFFERENT state ("total") using a
// formula that names the state under test ("unit_price"). removeStateReferences'
// id-based matching would never touch this (it matches on the modification's own
// stateUniqueId, "total_MODEL_1", not on names inside the formula text) -- this is
// exactly the hole findExpressionsReferencingState exists to catch.
function referenceDataWithExpression(): EditorReferenceData {
  return {
    activities: [
      {
        id: "activity_1",
        name: "Checkout",
        actions: [
          {
            id: "action_1",
            actionType: "ASSIGN",
            modifications: [
              {
                stateUniqueId: "total_MODEL_1",
                stateName: "total",
                operation: "ASSIGN",
                valueExpression: "qty * unit_price",
              },
            ],
          },
        ],
      },
    ],
    generators: [],
    connectors: [],
  };
}

describe("StatesEditor — delete-time expression warning", () => {
  it("warns about expressions referencing the state, and leaves the automatic-removal line unnumbered", () => {
    render(
      <StatesEditor
        states={buildStates()}
        onStatesChange={jest.fn()}
        defaultComponentType="ALL"
        referenceData={referenceDataWithExpression()}
      />
    );

    fireEvent.click(screen.getByTitle("Delete state"));

    expect(screen.getByText('Delete State: "unit_price"?')).toBeInTheDocument();
    expect(
      screen.getByText(/1 expression references this state inside a formula and cannot be fixed automatically/i)
    ).toBeInTheDocument();
    expect(screen.getByText("total = qty * unit_price")).toBeInTheDocument();
    expect(screen.getByText(/engine rejects a formula that names a state which no longer exists/i)).toBeInTheDocument();

    // The automatic-removal sentence must not claim a specific count: Lucid's
    // cleanup runs extension-side (ModelManager.cleanupStateReferences), so this
    // panel cannot verify a number matches what actually gets cleaned up. It also
    // must not say "when you save" -- the States tab auto-saves immediately on
    // this same click, so that clause would describe a step that doesn't exist
    // on this tab (fix round 1, Finding 2).
    const autoRemovalLine = screen.getByText(
      /steps that set this state directly will have that reference removed automatically/i
    );
    expect(autoRemovalLine.textContent).not.toMatch(/\d+\s*place/i);
    expect(autoRemovalLine.textContent).not.toMatch(/when you save/i);
  });

  it("does not show the expression warning when no formula references the state", () => {
    render(
      <StatesEditor
        states={buildStates()}
        onStatesChange={jest.fn()}
        defaultComponentType="ALL"
        referenceData={{ activities: [], generators: [], connectors: [] }}
      />
    );

    fireEvent.click(screen.getByTitle("Delete state"));

    expect(screen.getByText('Delete State: "unit_price"?')).toBeInTheDocument();
    expect(screen.queryByText(/cannot be fixed automatically/i)).not.toBeInTheDocument();
  });

  it("does not throw when referenceData is omitted entirely", () => {
    render(
      <StatesEditor states={buildStates()} onStatesChange={jest.fn()} defaultComponentType="ALL" />
    );

    fireEvent.click(screen.getByTitle("Delete state"));

    expect(screen.getByText('Delete State: "unit_price"?')).toBeInTheDocument();
    expect(screen.queryByText(/cannot be fixed automatically/i)).not.toBeInTheDocument();
  });
});
