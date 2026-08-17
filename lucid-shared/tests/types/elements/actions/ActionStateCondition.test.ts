import { createDelayAction } from '@quodsi/shared';
import { createDisposeAction } from '@quodsi/shared';
import { createSeizeAction } from '@quodsi/shared';
import { createBranchAction } from '@quodsi/shared';
import { StateCondition } from '@quodsi/shared';
import { StateComparison } from '@quodsi/shared';
import { Duration } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';

// Wire-cleanup Phase B2 Task 6/9: the guard field on every action is
// `condition` (not the old `stateCondition`); `StateCondition`'s state
// reference is `stateId` (not `stateName`); `StateComparison.EQUAL`'s wire
// value is `"equal"` (not `"=="`, Task 3's enum-value flip). `Duration` is a
// plain data interface now (no constructor) — use `Duration.constant(...)`.
describe("Action condition field", () => {
  const duration = () => Duration.constant(1, PeriodUnit.MINUTES);
  const condition = new StateCondition("color", StateComparison.EQUAL, "red");

  it("factory defaults to null when not provided", () => {
    const action = createDelayAction(duration());
    expect(action.condition).toBeNull();
  });

  it("factory accepts condition parameter", () => {
    const action = createDelayAction(duration(), condition);
    expect(action.condition).toBeDefined();
    expect(action.condition!.stateId).toBe("color");
    expect(action.condition!.value).toBe("red");
  });

  it("DisposeAction accepts condition", () => {
    const action = createDisposeAction(condition);
    expect(action.condition!.stateId).toBe("color");
  });

  it("SeizeAction accepts condition", () => {
    const action = createSeizeAction("req_1", condition);
    expect(action.condition!.stateId).toBe("color");
  });

  it("BranchAction accepts condition via options (the branch's own routing selector)", () => {
    const action = createBranchAction({ condition });
    expect(action.condition!.stateId).toBe("color");
  });

  it("condition serializes to JSON", () => {
    const action = createDelayAction(duration(), condition);
    const json = action.condition!.toJSON();
    expect(json).toEqual({
      stateId: "color",
      comparison: "equal",
      value: "red"
    });
  });
});
