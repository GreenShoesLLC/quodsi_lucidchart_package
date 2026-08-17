// Lucid twin of quodsi_studio/src/platforms/shared/__tests__/QueueRankingSection.test.tsx.
// The two components must not drift, so the assertions here mirror that file's.

// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueueRankingSection } from "../QueueRankingSection";
import {
  State,
  ComponentType,
  StateType,
  QUEUE_RANKING_COPY,
} from "@quodsi/lucid-shared";

const state = (name: string, componentType: ComponentType, dataType: StateType) =>
  new State(`id-${name}`, name, componentType, dataType, 0);

const ELIGIBLE = [state("severity", ComponentType.ENTITY, StateType.NUMBER)];
// Wire-cleanup Phase B2 Task 6 fix round (F1): QueueRanking is id-keyed now
// (`stateId`), so "the ranked state is no longer eligible" is modeled here as
// the SAME state id/name RETYPED to a scope eligibleRankingStates rejects
// (MODEL, not ENTITY) -- not removed from `allStates` outright. Retyping
// keeps the id resolvable (the component can still show the real name via
// allStates.find); a true delete instead falls back to the raw id.
const INELIGIBLE = [state("severity", ComponentType.MODEL, StateType.NUMBER)];
const RANKING = { stateId: "id-severity", order: "ascending" } as const;

describe("QueueRankingSection (Lucid)", () => {
  it("disables both controls and explains the prerequisite when nothing is eligible", () => {
    render(<QueueRankingSection allStates={INELIGIBLE} onChange={jest.fn()} />);
    expect(screen.getByText(QUEUE_RANKING_COPY.noStatesHint)).toBeInTheDocument();
    for (const box of screen.getAllByRole("combobox")) expect(box).toBeDisabled();
  });

  it("emits undefined when cleared, so the activity returns to FIFO", async () => {
    const onChange = jest.fn();
    render(
      <QueueRankingSection value={{ ...RANKING }} allStates={ELIGIBLE} onChange={onChange} />
    );
    await userEvent.selectOptions(screen.getByLabelText(QUEUE_RANKING_COPY.stateLabel), "");
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  // Final-review finding 3. Delete (or retype) the last eligible state and the
  // ranking that referenced it becomes an ERROR the model cannot simulate
  // through. Keying `disabled` off `!hasEligible` alone greyed the picker out
  // exactly then — the ERROR was unfixable from the panel that caused it.
  it("keeps the picker usable when the ranked state is gone, so FIFO stays reachable", async () => {
    const onChange = jest.fn();
    render(
      <QueueRankingSection value={{ ...RANKING }} allStates={INELIGIBLE} onChange={onChange} />
    );
    const picker = screen.getByLabelText(QUEUE_RANKING_COPY.stateLabel);
    expect(picker).toBeEnabled();
    await userEvent.selectOptions(picker, "");
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  // Final-review finding 4. A controlled <select> whose value matches no option
  // renders BLANK, so before this the same stale ranking read as "no ranking" in
  // Lucid while drawio labelled it. Same copy object, so the hosts cannot drift.
  it("labels a ranking whose state is gone instead of rendering blank", () => {
    render(
      <QueueRankingSection value={{ ...RANKING }} allStates={INELIGIBLE} onChange={jest.fn()} />
    );
    expect(
      screen.getByRole("option", { name: QUEUE_RANKING_COPY.missingState("severity") })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(QUEUE_RANKING_COPY.stateLabel)).toHaveValue("__missing__");
  });
});
