// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
jest.mock("axios", () => ({}));

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

// NOTE: unlike ActivityEditor.levers.test.tsx, this file does NOT stub
// "../hooks/useEditorState". That mock replaces useAutoSave with a static,
// disconnected object (a fresh no-op saveNow on every render), which never
// invokes the onSave prop — the very thing test 1 below needs to observe.
// The real useAutoSave is a pure hook (no axios/network deps), safe to run
// unmocked in jsdom; onBlur synchronously flushes through its real saveNow.

jest.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

const baseProps = {
  states: {} as any,
  onStatesChange: jest.fn(),
  referenceData: {} as any,
};

const unranked = {
  id: "act-1",
  name: "Doctor",
  capacity: 1,
  inboundQueueCapacity: 999999,
  outboundQueueCapacity: 999999,
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
    inboundQueueCapacity: 999999,
    outboundQueueCapacity: 999999,
    actions: [],
    queueRanking: { stateName: "severity", order: "ASCENDING" },
  } as any;

  it("keeps the ranking when an unrelated field is edited", async () => {
    const onSave = jest.fn();
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
    expect(saved.queueRanking).toEqual({ stateName: "severity", order: "ASCENDING" });
  });

  // The case that fails under `updates.queueRanking ?? base.queueRanking`:
  // a cleared ranking must STAY cleared through the next unrelated edit.
  it("keeps the ranking cleared once cleared", async () => {
    const onSave = jest.fn();
    render(<ActivityEditor activity={ranked} onSave={onSave} {...baseProps} />);
    const draft = updateActivityImmutably(extractActivityData(ranked), {
      queueRanking: undefined,
    } as any);
    expect(draft.queueRanking).toBeUndefined();
    const afterUnrelatedEdit = updateActivityImmutably(draft, { name: "Nurse" });
    expect(afterUnrelatedEdit.queueRanking).toBeUndefined();
  });
});

describe("ActivityEditor — queue ranking control", () => {
  it("offers only ENTITY NUMBER states and writes the ranking on pick", async () => {
    const onSave = jest.fn();
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
      stateName: "severity",
      order: "ASCENDING",
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
        onSave={jest.fn()}
        states={states}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Advanced Settings/ }));
    expect(screen.getByText(QUEUE_RANKING_COPY.noStatesHint)).toBeInTheDocument();
  });
});
