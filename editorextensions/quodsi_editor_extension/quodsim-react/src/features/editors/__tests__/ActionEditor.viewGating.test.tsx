// ActionEditor.viewGating.test.tsx
//
// Daniel's Lucid smoke (2026-09-04): in Basic, an activity's Action Type
// dropdown offered every action type. Studio's ActionCard filters its picker
// through the view catalog (ACTION_TYPE_SURFACE: delay is basic; seize /
// release / assign intermediate; the rest advanced) and grandfathers the
// selected value; Lucid's own ActionEditor never got that clause.
//
// Grandfathering is load-bearing: a Basic user opening a Split action must
// still see "Split Entity" selected -- dropping it would make the <select>
// fall to another value and one change event would rewrite the model.
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { ActionEditor } from "../ActionEditor";
import { ActionType, Duration, PeriodUnit, type Action } from "@quodsi/lucid-shared";
import { RequirementFieldContext, setView } from "quodsi_studio/platforms/shared";

function makeAccessor() {
  const snapshot = {
    modelDefinition: {
      resources: [{ id: "r1", name: "Operator" }],
      resourceRequirements: [
        { id: "r1", name: "Operator", rootClause: { id: "c", mode: "require_all", requests: [{ resourceId: "r1" }] } },
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

function renderActionEditor(action: Action) {
  render(
    <RequirementFieldContext.Provider value={makeAccessor()}>
      <ActionEditor action={action} index={0} expanded onToggleExpand={() => {}} onDelete={() => {}} onChange={vi.fn()} />
    </RequirementFieldContext.Provider>
  );
}

// The Action Type <select> has no associated label (its <label> wraps text,
// not the control), so it is reached as the first combobox in the card.
const typeSelect = () => screen.getAllByRole("combobox")[0] as HTMLSelectElement;
const optionLabels = () => within(typeSelect()).getAllByRole("option").map((o) => o.textContent);

const delay = { id: "a1", type: ActionType.DELAY_WITH_RESOURCE, duration: Duration.constant(1, PeriodUnit.MINUTES), condition: null } as Action;
const split = { id: "a2", type: ActionType.SPLIT, entityCount: 2, entityId: "", condition: null } as unknown as Action;

beforeEach(() => { localStorage.clear(); setView("basic"); });
afterEach(() => setView("basic"));

describe("ActionEditor — the Action Type picker follows the view", () => {
  it("Basic offers Delay only", () => {
    renderActionEditor(delay);
    expect(optionLabels()).toEqual(["Delay"]);
  });

  it("Intermediate adds Seize, Release and Assign", () => {
    setView("intermediate");
    renderActionEditor(delay);
    expect(optionLabels()).toEqual(["Assign State", "Seize Resource", "Release Resource", "Delay"]);
  });

  it("Advanced offers every authorable type", () => {
    setView("advanced");
    renderActionEditor(delay);
    expect(optionLabels()).toEqual([
      "Assign State", "Seize Resource", "Release Resource", "Delay",
      "Split Entity", "Create Entity", "Dispose Entity", "Join Entities",
    ]);
  });

  it("grandfathers an above-view selected type, disabled, so the model is never rewritten", () => {
    renderActionEditor(split);
    const select = typeSelect();
    expect(select.value).toBe(ActionType.SPLIT);
    const splitOption = within(select).getByRole("option", { name: "Split Entity" }) as HTMLOptionElement;
    expect(splitOption.disabled).toBe(true);
    expect(optionLabels()).toEqual(["Delay", "Split Entity"]);
  });
});
