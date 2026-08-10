// The one untested hop, per fix-round-1 review: ModelEditor.tsx passes
// `referenceData={referenceData}` into <StatesEditor> (~line 594). Delete just
// that prop and all other suites stay green -- referenceData is optional, so
// it's not even a type error -- while the delete-time expression warning never
// fires again. StatesEditor.deleteWarning.test.tsx builds its own
// EditorReferenceData literal and never touches ModelEditor's wiring;
// referenceDataBuilder.stateExpressions.test.ts stops at the builder. This
// test is the one that actually observes the prop crossing that boundary.
//
// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ModelEditor from "../ModelEditor";
import {
  StateListManager,
  State,
  ComponentType,
  StateType,
  EditorReferenceData,
} from "@quodsi/lucid-shared";

jest.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: jest.fn(),
    selectElement: jest.fn(),
    updateElementData: jest.fn(),
  }),
}));

jest.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

jest.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: jest.fn() }),
  useFlushOnChange: () => {},
}));

jest.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

function buildStates(): StateListManager {
  const states = new StateListManager();
  states.add(new State("unit_price_ENTITY_1", "unit_price", ComponentType.ENTITY, StateType.NUMBER, 0));
  return states;
}

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

const baseProps = {
  model: { id: "m1", name: "My Model", reps: 1, seed: 12345, levers: [] } as any,
  onSave: jest.fn(),
  states: buildStates(),
  onStatesChange: jest.fn(),
  entities: [],
  onEntitiesChange: jest.fn(),
  activeTab: "states" as const,
};

describe("ModelEditor — threads referenceData into the States delete dialog", () => {
  it("shows the expression-reference warning when deleting a state referenced by a formula elsewhere", () => {
    render(<ModelEditor {...baseProps} referenceData={referenceDataWithExpression()} />);

    fireEvent.click(screen.getByTitle("Delete state"));

    expect(screen.getByText('Delete State: "unit_price"?')).toBeInTheDocument();
    expect(
      screen.getByText(/1 expression references this state inside a formula and cannot be fixed automatically/i)
    ).toBeInTheDocument();
    expect(screen.getByText("total = qty * unit_price")).toBeInTheDocument();
  });
});
