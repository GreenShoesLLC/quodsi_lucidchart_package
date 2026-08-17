// ActionEditor.actionTypeChange.test.ts
//
// Verifies that every action-type branch in ActionEditor's handleActionTypeChange
// produces an action with a non-empty `id`.  The component delegates to the
// shared create* factories, so we test those factories directly with the exact
// arguments that handleActionTypeChange passes — matching Task 6b-3 wiring.
//
// No React rendering is needed; these are pure function calls.

// @quodsi/lucid-shared pulls in lucidApi.js -> axios ESM, which Jest can't parse.
jest.mock("axios", () => ({}));

import {
  createAssignAction,
  createSeizeAction,
  createReleaseAction,
  createDelayAction,
  createDelayWithResourceAction,
  createSplitAction,
  createCreateAction,
  createDisposeAction,
  createJoinAction,
  createLoopAction,
  createBranchAction,
  Duration,
  PeriodUnit,
} from "@quodsi/lucid-shared";

describe("handleActionTypeChange factory wiring — id assignment", () => {
  it("ASSIGN: createAssignAction([]) produces a non-empty id", () => {
    const action = createAssignAction([]);
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  // Wire-cleanup Phase B2 Task 6/10: the old '' scaffold sentinel is retired —
  // resourceRequirementId is REQUIRED and non-empty on the clean wire, so
  // handleActionTypeChange now calls createSeizeAction() with no argument
  // (omits the key entirely) rather than passing ''.
  it("SEIZE: createSeizeAction() produces a non-empty id, no resourceRequirementId", () => {
    const action = createSeizeAction();
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
    expect(action.resourceRequirementId).toBeUndefined();
  });

  // Absent resourceRequirementId means "release ALL" on the clean wire.
  it("RELEASE: createReleaseAction() produces a non-empty id, no resourceRequirementId", () => {
    const action = createReleaseAction();
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
    expect(action.resourceRequirementId).toBeUndefined();
  });

  it("DELAY: createDelayAction(Duration.constant(0, MINUTES)) produces a non-empty id", () => {
    const action = createDelayAction(Duration.constant(0, PeriodUnit.MINUTES));
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("DELAY_WITH_RESOURCE: createDelayWithResourceAction(Duration.constant(0, MINUTES)) produces a non-empty id", () => {
    const action = createDelayWithResourceAction(Duration.constant(0, PeriodUnit.MINUTES));
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
    // Verify default shape matches what the old literal set
    expect(action.resourceRequirementId).toBeNull();
    expect(action.keepResource).toBe(false);
    expect(action.modifications).toEqual([]);
  });

  it("SPLIT: createSplitAction(1) produces a non-empty id", () => {
    const action = createSplitAction(1);
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("CREATE: createCreateAction() produces a non-empty id", () => {
    const action = createCreateAction();
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("DISPOSE: createDisposeAction() produces a non-empty id", () => {
    const action = createDisposeAction();
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("JOIN: createJoinAction() produces a non-empty id", () => {
    const action = createJoinAction();
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("LOOP: createLoopAction() produces a non-empty id", () => {
    const action = createLoopAction();
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("BRANCH: createBranchAction() produces a non-empty id", () => {
    const action = createBranchAction();
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("each call to createAssignAction produces a unique id", () => {
    const a1 = createAssignAction([]);
    const a2 = createAssignAction([]);
    expect(a1.id).not.toBe(a2.id);
  });
});
