// ActionEditor.actionTypeChange.test.ts
//
// Verifies that every action-type branch in ActionEditor's handleActionTypeChange
// produces an action with a non-empty `id`.  The component delegates to the
// shared create* factories, so we test those factories directly with the exact
// arguments that handleActionTypeChange passes — matching Task 6b-3 wiring.
//
// No React rendering is needed; these are pure function calls.

// @quodsi/shared pulls in lucidApi.js -> axios ESM, which Jest can't parse.
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
} from "@quodsi/shared";

describe("handleActionTypeChange factory wiring — id assignment", () => {
  it("ASSIGN: createAssignAction([]) produces a non-empty id", () => {
    const action = createAssignAction([]);
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("SEIZE: createSeizeAction('') produces a non-empty id", () => {
    const action = createSeizeAction("");
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("RELEASE: createReleaseAction('') produces a non-empty id", () => {
    const action = createReleaseAction("");
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("DELAY: createDelayAction(new Duration()) produces a non-empty id", () => {
    const action = createDelayAction(new Duration());
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
  });

  it("DELAY_WITH_RESOURCE: createDelayWithResourceAction(new Duration()) produces a non-empty id", () => {
    const action = createDelayWithResourceAction(new Duration());
    expect(action.id).toBeDefined();
    expect(action.id.length).toBeGreaterThan(0);
    // Verify default shape matches what the old literal set
    expect(action.resourceRequirementId).toBeNull();
    expect(action.keepResource).toBe(false);
    expect(action.stateModifications).toEqual([]);
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
