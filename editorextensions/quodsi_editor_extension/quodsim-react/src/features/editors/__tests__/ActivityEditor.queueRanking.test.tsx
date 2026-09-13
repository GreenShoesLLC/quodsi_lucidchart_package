import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityEditor, {
  extractActivityData,
  updateActivityImmutably,
} from "../ActivityEditor";
import {
  StateListManager,
  State,
  ComponentType,
  StateType,
  QUEUE_RANKING_COPY,
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

// NOTE: unlike ActivityEditor.levers.test.tsx, this file does NOT stub
// "../hooks/useEditorState". That mock replaces useAutoSave with a static,
// disconnected object (a fresh no-op saveNow on every render), which never
// invokes the onSave prop — the very thing test 1 below needs to observe.
// The real useAutoSave is a pure hook (no axios/network deps), safe to run
// unmocked in jsdom; onBlur synchronously flushes through its real saveNow.

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

// The editor now saves through the model-root source's batched shape queue
// (spec 2026-09-13 lucid-shape-writes §3), not a plain onSave prop. This fake
// source stands in for useModelRootSource so each test can assert on the
// patch handed to accessor.updateShape instead. `projection: null` keeps the
// editor drafting from the test's own selection fixture (extractActivityData
// falls back to `activity` when no snapshot record exists).
const { modelRoot } = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const snapshot = { modelDefinition: { activities: [], generators: [], workSchedules: [] }, saveStatus: "idle", saveError: null };
  return {
    modelRoot: {
      accessor: {
        subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
        getSnapshot: () => snapshot,
        updateShape: vi.fn(async (_id: string, _type: string, _patch: Record<string, unknown>) => {}),
        updateModel: vi.fn(async () => {}),
        flushModelImmediate: vi.fn(async () => {}),
      },
      projection: null,
      request: () => {},
    },
  };
});

vi.mock("../../../adapters/useModelRootSource", () => ({
  useModelRootSource: () => modelRoot,
  MODEL_ROOT_DEBOUNCE_MS: 400,
}));

beforeEach(() => {
  modelRoot.accessor.updateShape.mockClear();
});

const baseProps = {
  states: {} as any,
  referenceData: {} as any,
};

const unranked = {
  id: "act-1",
  name: "Doctor",
  capacity: 1,
  inboundCapacity: 999999,
  outboundCapacity: 999999,
  actions: [],
} as any;

function makeStateListManager(states: State[]): StateListManager {
  const manager = new StateListManager();
  for (const s of states) manager.add(s);
  return manager;
}

/** The patch handed to the model-root source's last accessor.updateShape call. */
async function lastPatch() {
  await waitFor(() => expect(modelRoot.accessor.updateShape).toHaveBeenCalled());
  const call = modelRoot.accessor.updateShape.mock.calls.at(-1);
  expect(call).toBeDefined();
  return call![2] as Record<string, unknown>;
}

describe("ActivityEditor — queueRanking preservation", () => {
  const ranked = {
    id: "act-1",
    name: "Doctor",
    capacity: 1,
    inboundCapacity: 999999,
    outboundCapacity: 999999,
    actions: [],
    queueRanking: { stateId: "s1", order: "ascending" },
  } as any;

  it("keeps the ranking when an unrelated field is edited", async () => {
    render(<ActivityEditor activity={ranked} {...baseProps} />);
    // The name input has no accessible-name association in this component
    // (label is a plain sibling, not `htmlFor`-linked), so re-query by role
    // doesn't resolve it — reuse the element handle found via display value.
    const nameInput = screen.getByDisplayValue("Doctor");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Nurse");
    fireEvent.blur(nameInput);
    const patch = await lastPatch();
    expect(patch.queueRanking).toEqual({ stateId: "s1", order: "ascending" });
  });

  // The case that fails under `updates.queueRanking ?? base.queueRanking`:
  // a cleared ranking must STAY cleared through the next unrelated edit.
  it("keeps the ranking cleared once cleared", async () => {
    render(<ActivityEditor activity={ranked} {...baseProps} />);
    const draft = updateActivityImmutably(extractActivityData(ranked), {
      queueRanking: undefined,
    } as any);
    expect(draft.queueRanking).toBeUndefined();
    const afterUnrelatedEdit = updateActivityImmutably(draft, { name: "Nurse" });
    expect(afterUnrelatedEdit.queueRanking).toBeUndefined();
  });
});

// The extension deletes a stored queueRanking only when the payload SAYS it was
// cleared — absence alone means "this panel never mentioned the field", which is
// exactly what ConnectorsEditor's partial Activity payload looks like. So the
// one panel that owns the control has to speak up. Since Task 4, that
// declaration is the model-root source's own `clearedFields` list (built from
// an `undefined`-valued key in the patch handed to accessor.updateShape) —
// not a CLEARED_FIELDS_KEY on a saved object.
describe("ActivityEditor — explicit cleared-field declaration", () => {
  const ranked = {
    id: "act-1",
    name: "Doctor",
    capacity: 1,
    inboundCapacity: 999999,
    outboundCapacity: 999999,
    actions: [],
    queueRanking: { stateId: "s1", order: "ascending" },
  } as any;

  async function patchAfterRename(activity: any) {
    render(<ActivityEditor activity={activity} {...baseProps} />);
    const nameInput = screen.getByDisplayValue("Doctor");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Nurse");
    fireEvent.blur(nameInput);
    return lastPatch();
  }

  // MEMBERSHIP, not equality: Task D3 gave this editor a second clearable
  // field (workScheduleId, declared by the same activityShapePatch whenever the
  // draft carries no work-schedule link -- see
  // ActivityEditor.workSchedule.test.tsx). These two tests are about
  // queueRanking, so they assert only about queueRanking; an exact-array
  // assertion here would fail every time a THIRD clearable field is added,
  // without saying anything about the one under test.
  it("declares queueRanking cleared when it saves an activity with no ranking", async () => {
    const patch = await patchAfterRename(unranked);
    expect("queueRanking" in patch && patch.queueRanking === undefined).toBe(true);
  });

  it("declares nothing about queueRanking while a ranking is set", async () => {
    const patch = await patchAfterRename(ranked);
    expect(patch.queueRanking).toEqual({ stateId: "s1", order: "ascending" });
  });
});

describe("ActivityEditor — queue ranking control", () => {
  it("offers only ENTITY NUMBER states and writes the ranking on pick", async () => {
    const states = makeStateListManager([
      new State("s1", "severity", ComponentType.ENTITY, StateType.NUMBER, 0),
      new State("s2", "globalCount", ComponentType.MODEL, StateType.NUMBER, 0),
    ]);
    render(
      <ActivityEditor
        {...baseProps}
        activity={unranked}
        states={states}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Advanced Settings/ }));
    const picker = screen.getByLabelText(QUEUE_RANKING_COPY.stateLabel);
    expect(within(picker).queryByRole("option", { name: /globalCount/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(picker, "severity");
    const patch = await lastPatch();
    expect(patch.queueRanking).toEqual({
      stateId: "s1",
      order: "ascending",
    });
  });

  it("shows the prerequisite hint when no ENTITY NUMBER state exists", async () => {
    const states = makeStateListManager([
      new State("s2", "globalCount", ComponentType.MODEL, StateType.NUMBER, 0),
    ]);
    render(
      <ActivityEditor
        {...baseProps}
        activity={unranked}
        states={states}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Advanced Settings/ }));
    expect(screen.getByText(QUEUE_RANKING_COPY.noStatesHint)).toBeInTheDocument();
  });
});
