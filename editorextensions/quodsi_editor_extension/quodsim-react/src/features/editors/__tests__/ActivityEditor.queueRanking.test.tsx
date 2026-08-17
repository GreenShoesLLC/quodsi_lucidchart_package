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
  CLEARED_FIELDS_KEY,
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

const baseProps = {
  states: {} as any,
  onStatesChange: vi.fn(),
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
    const onSave = vi.fn();
    render(<ActivityEditor activity={ranked} onSave={onSave} {...baseProps} />);
    // The name input has no accessible-name association in this component
    // (label is a plain sibling, not `htmlFor`-linked), so re-query by role
    // doesn't resolve it — reuse the element handle found via display value.
    const nameInput = screen.getByDisplayValue("Doctor");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Nurse");
    fireEvent.blur(nameInput);
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.calls.at(-1)[0];
    expect(saved.queueRanking).toEqual({ stateId: "s1", order: "ascending" });
  });

  // The case that fails under `updates.queueRanking ?? base.queueRanking`:
  // a cleared ranking must STAY cleared through the next unrelated edit.
  it("keeps the ranking cleared once cleared", async () => {
    const onSave = vi.fn();
    render(<ActivityEditor activity={ranked} onSave={onSave} {...baseProps} />);
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
// one panel that owns the control has to speak up.
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

  async function saveAfterRename(activity: any) {
    const onSave = vi.fn();
    render(<ActivityEditor activity={activity} onSave={onSave} {...baseProps} />);
    const nameInput = screen.getByDisplayValue("Doctor");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Nurse");
    fireEvent.blur(nameInput);
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    return onSave.mock.calls.at(-1)[0];
  }

  it("declares queueRanking cleared when it saves an activity with no ranking", async () => {
    const saved = await saveAfterRename(unranked);
    expect(saved[CLEARED_FIELDS_KEY]).toEqual(["queueRanking"]);
  });

  it("declares nothing while a ranking is set", async () => {
    const saved = await saveAfterRename(ranked);
    expect(saved.queueRanking).toEqual({ stateId: "s1", order: "ascending" });
    expect(CLEARED_FIELDS_KEY in saved).toBe(false);
  });
});

describe("ActivityEditor — queue ranking control", () => {
  it("offers only ENTITY NUMBER states and writes the ranking on pick", async () => {
    const onSave = vi.fn();
    const states = makeStateListManager([
      new State("s1", "severity", ComponentType.ENTITY, StateType.NUMBER, 0),
      new State("s2", "globalCount", ComponentType.MODEL, StateType.NUMBER, 0),
    ]);
    render(
      <ActivityEditor
        {...baseProps}
        activity={unranked}
        onSave={onSave}
        states={states}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Advanced Settings/ }));
    const picker = screen.getByLabelText(QUEUE_RANKING_COPY.stateLabel);
    expect(within(picker).queryByRole("option", { name: /globalCount/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(picker, "severity");
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls.at(-1)[0].queueRanking).toEqual({
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
        onSave={vi.fn()}
        states={states}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Advanced Settings/ }));
    expect(screen.getByText(QUEUE_RANKING_COPY.noStatesHint)).toBeInTheDocument();
  });
});
