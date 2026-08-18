// The one untested hop, per fix-round-1 review: ModelEditor.tsx passes
// `referenceData={referenceData}` into <StatesEditor> (~line 594). Delete just
// that prop and all other suites stay green -- referenceData is optional, so
// it's not even a type error -- while the delete-time expression warning never
// fires again. StatesEditor.deleteWarning.test.tsx builds its own
// EditorReferenceData literal and never touches ModelEditor's wiring;
// referenceDataBuilder.stateExpressions.test.ts stops at the builder. This
// test is the one that actually observes the prop crossing that boundary.

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

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

vi.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

function buildStates(): StateListManager {
  const states = new StateListManager();
  states.add(new State("unit_price_ENTITY_1", "unit_price", ComponentType.ENTITY, StateType.NUMBER, 0));
  // The state a DIFFERENT modification assigns via an expression referencing
  // the deleted state — StatesEditor resolves ExpressionStateReference.stateId
  // (an id, wire-cleanup Phase B2 Task 6/9) to a display name against this
  // same states list.
  states.add(new State("total_MODEL_1", "total", ComponentType.MODEL, StateType.NUMBER, 0));
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
            type: "assign",
            modifications: [
              {
                stateId: "total_MODEL_1",
                operation: "assign",
                expression: "qty * unit_price",
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
  model: { id: "m1", name: "My Model", replications: 1, seed: 12345, levers: [] } as any,
  onSave: vi.fn(),
  states: buildStates(),
  onStatesChange: vi.fn(),
  entities: [],
  onEntitiesChange: vi.fn(),
  activeTab: "states" as const,
};

describe("ModelEditor — threads referenceData into the States delete dialog", () => {
  it("shows the expression-reference warning when deleting a state referenced by a formula elsewhere", () => {
    render(<ModelEditor {...baseProps} referenceData={referenceDataWithExpression()} />);

    // Two states now render (unit_price + the "total" state the expression
    // fixture resolves its display name against) — insertion order (via
    // StateListManager's Map) puts unit_price first.
    fireEvent.click(screen.getAllByTitle("Delete state")[0]);

    expect(screen.getByText('Delete State: "unit_price"?')).toBeInTheDocument();
    expect(
      screen.getByText(/1 expression references this state inside a formula and cannot be fixed automatically/i)
    ).toBeInTheDocument();
    expect(screen.getByText("total = qty * unit_price")).toBeInTheDocument();
  });
});
