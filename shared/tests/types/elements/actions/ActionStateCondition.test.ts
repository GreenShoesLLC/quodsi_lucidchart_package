import { ActionType } from "../../../../src/types/elements/actions/ActionType";
import { createDelayAction } from "../../../../src/types/elements/actions/DelayAction";
import { createDisposeAction } from "../../../../src/types/elements/actions/DisposeAction";
import { createSeizeAction } from "../../../../src/types/elements/actions/SeizeAction";
import { createBranchAction } from "../../../../src/types/elements/actions/BranchAction";
import { StateCondition } from "../../../../src/types/elements/StateCondition";
import { StateComparison } from "../../../../src/types/elements/StateComparison";
import { Duration } from "../../../../src/types/elements/Duration";

describe("Action stateCondition field", () => {
  const condition = new StateCondition("color", StateComparison.EQUAL, "red");

  it("factory defaults to null when not provided", () => {
    const action = createDelayAction(new Duration());
    expect(action.stateCondition).toBeNull();
  });

  it("factory accepts stateCondition parameter", () => {
    const action = createDelayAction(new Duration(), condition);
    expect(action.stateCondition).toBeDefined();
    expect(action.stateCondition!.stateName).toBe("color");
    expect(action.stateCondition!.value).toBe("red");
  });

  it("DisposeAction accepts stateCondition", () => {
    const action = createDisposeAction(condition);
    expect(action.stateCondition!.stateName).toBe("color");
  });

  it("SeizeAction accepts stateCondition", () => {
    const action = createSeizeAction("req_1", condition);
    expect(action.stateCondition!.stateName).toBe("color");
  });

  it("BranchAction accepts stateCondition via options", () => {
    const action = createBranchAction({ stateCondition: condition });
    expect(action.stateCondition!.stateName).toBe("color");
  });

  it("stateCondition serializes to JSON", () => {
    const action = createDelayAction(new Duration(), condition);
    const json = action.stateCondition!.toJSON();
    expect(json).toEqual({
      stateName: "color",
      comparison: "==",
      value: "red"
    });
  });
});
