// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityEditor, {
  extractActivityData,
  updateActivityImmutably,
} from "../ActivityEditor";

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
