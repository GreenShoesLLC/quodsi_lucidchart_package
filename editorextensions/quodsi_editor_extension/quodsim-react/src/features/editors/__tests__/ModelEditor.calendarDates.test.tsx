// Calendar-mode date authoring in the Lucid ModelEditor.
//
// The three pickers used to write STORED `startDateTime`/`finishDateTime`/
// `warmupDateTime` Dates. Only `startDateTime` is on the wire: the engine
// rebuilds `warmupDateTime = start - warmupTime` and
// `finishDateTime = start + runTime` (`document/clean/translate.py`,
// `_translate_model_block`), so a finish or warmup date picked here reached
// no run at all -- and Run Time / Warmup Time, the fields that DO reach one,
// are hidden in calendar mode. These tests pin the inverted writes, the
// local-wall-clock round trip that `toISOString().slice(0,16)` used to skew
// by the viewer's UTC offset, and the Calendar->Clock clear.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ModelEditor from "../ModelEditor";
import { setView } from "quodsi_studio/platforms/shared";
// Replications, Time Mode, Clock Unit and Warmup all moved to the
// INTERMEDIATE view on 2026-09-01 (Renee's simple-version spec: a Basic
// model's Basic tab is Model Name + Run Time). This file pins field
// BEHAVIOUR, not gating, so it asks for a view that renders the fields.
// The gating itself lives in viewGating.test.tsx.
beforeEach(() => setView('intermediate'));
afterEach(() => setView('basic'));

import { extractModelData } from "../../utils/modelEditorHelpers";
import { PeriodUnit, SimulationTimeType } from "@quodsi/lucid-shared";

// The mocked useAutoSave records every draft it is handed, which is the only
// way to see what the editor actually WROTE: the real save path needs a Redux
// isSaving flip that no test harness here provides.
const h = vi.hoisted(() => ({ drafts: [] as any[] }));

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

vi.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: (args: any) => {
    h.drafts.push(args.draft);
    return { status: "saved", lastSavedAt: null, saveNow: vi.fn() };
  },
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

/** The draft the editor most recently held. */
const latestDraft = () => h.drafts[h.drafts.length - 1];

/** Local wall clock -> the Date the model stores, so expectations never
 *  depend on the machine's timezone. */
const localDate = (s: string) => new Date(s);

const calendarModel = (over: Record<string, unknown> = {}) =>
  ({
    id: "m1",
    name: "My Model",
    replications: 1,
    seed: 12345,
    levers: [],
    timeUnit: PeriodUnit.HOURS,
    timeMode: SimulationTimeType.CalendarDate,
    startDateTime: localDate("2026-06-01T08:00"),
    warmupTime: { value: 2, unit: PeriodUnit.HOURS },
    runTime: { value: 24, unit: PeriodUnit.HOURS },
    ...over,
  }) as any;

const baseProps = (model: any) => ({
  model,
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  entities: [],
  onEntitiesChange: vi.fn(),
});

const expandAdvanced = () =>
  fireEvent.click(screen.getByRole("button", { name: /advanced settings/i }));

const renderCalendar = (over: Record<string, unknown> = {}) => {
  h.drafts.length = 0;
  render(<ModelEditor {...baseProps(calendarModel(over))} />);
  expandAdvanced();
};

const dateInput = (label: string) =>
  screen.getByLabelText(`${label} date`) as HTMLInputElement;
const timeInput = (label: string) =>
  screen.getByLabelText(`${label} time`) as HTMLInputElement;

/** Feedback 8b: warmup is behind an explicit checkbox now, so the Warmup Date
 *  field only exists once the box is ticked. Shared with Studio's
 *  BasicSettingsTab — WarmupDateField is the same component. */
const warmupCheckbox = () =>
  screen.getByRole("checkbox", { name: /use a warm-up period/i });

describe("ModelEditor — calendar dates", () => {
  beforeEach(() => {
    h.drafts.length = 0;
  });

  it("renders the three dates in chronological order: warmup, start, finish", () => {
    renderCalendar();
    const labels = screen
      .getAllByLabelText(/(Warmup Date|Start Date|Finish Date) date/)
      .map((el) => el.getAttribute("aria-label"));
    expect(labels).toEqual([
      "Warmup Date date",
      "Start Date date",
      "Finish Date date",
    ]);
  });

  it("shows the derived warmup and finish instants in LOCAL wall clock", () => {
    // start 08:00 local, warmup 2h, run 24h -> warmup 06:00, finish next 08:00.
    renderCalendar();
    expect(dateInput("Warmup Date").value).toBe("2026-06-01");
    expect(timeInput("Warmup Date").value).toBe("06:00");
    expect(dateInput("Start Date").value).toBe("2026-06-01");
    expect(timeInput("Start Date").value).toBe("08:00");
    expect(dateInput("Finish Date").value).toBe("2026-06-02");
    expect(timeInput("Finish Date").value).toBe("08:00");
  });

  it("round-trips a start date without UTC drift", () => {
    // `toISOString().slice(0,16)` fed a UTC instant into a LOCAL-time input,
    // so every open/save shifted the value by the viewer's offset.
    renderCalendar();
    fireEvent.change(timeInput("Start Date"), { target: { value: "23:30" } });
    expect(latestDraft().startDateTime.getTime()).toBe(
      localDate("2026-06-01T23:30").getTime()
    );
    expect(dateInput("Start Date").value).toBe("2026-06-01");
    expect(timeInput("Start Date").value).toBe("23:30");
  });

  it("picking a finish date writes runTime, not finishDateTime", () => {
    renderCalendar();
    fireEvent.change(dateInput("Finish Date"), { target: { value: "2026-06-04" } });
    fireEvent.change(timeInput("Finish Date"), { target: { value: "08:00" } });
    const draft = latestDraft();
    // 2026-06-01T08:00 -> 2026-06-04T08:00 is exactly 3 days.
    expect(draft.runTime).toMatchObject({ value: 3, unit: PeriodUnit.DAYS });
    expect(draft.finishDateTime).toBeNull();
  });

  it("picking a warmup date writes warmupTime, not warmupDateTime", () => {
    renderCalendar();
    fireEvent.change(timeInput("Warmup Date"), { target: { value: "03:00" } });
    const draft = latestDraft();
    // 05:00 before the 08:00 start.
    expect(draft.warmupTime).toMatchObject({ value: 5, unit: PeriodUnit.HOURS });
    expect(draft.warmupDateTime).toBeNull();
  });

  it("loads unchecked with no Warmup Date field when the stored warmup is zero (8b)", () => {
    renderCalendar({ warmupTime: { value: 0, unit: PeriodUnit.HOURS } });
    expect(warmupCheckbox()).not.toBeChecked();
    expect(screen.queryByLabelText("Warmup Date date")).not.toBeInTheDocument();
  });

  it("ticking the warmup checkbox opens an EMPTY field and writes nothing (8b)", () => {
    renderCalendar({ warmupTime: { value: 0, unit: PeriodUnit.HOURS } });
    const draftsBefore = h.drafts.length;
    fireEvent.click(warmupCheckbox());
    expect(dateInput("Warmup Date").value).toBe("");
    // Ticking alone commits nothing -- otherwise ticking the box would
    // silently write a zero-length warmup.
    expect(h.drafts.length).toBe(draftsBefore);
  });

  it("unticking the warmup checkbox writes a zero warmupTime (8b)", () => {
    // Default model carries a nonzero warmup, so the box loads ticked.
    renderCalendar();
    expect(warmupCheckbox()).toBeChecked();
    fireEvent.click(warmupCheckbox());
    expect(latestDraft().warmupTime).toMatchObject({ value: 0 });
    expect(screen.queryByLabelText("Warmup Date date")).not.toBeInTheDocument();
  });

  it("reports an out-of-order warmup pick instead of silently dropping it", () => {
    renderCalendar();
    fireEvent.change(dateInput("Warmup Date"), { target: { value: "2026-06-03" } });
    expect(screen.getByTestId("calendar-date-error-warmup-date")).toBeInTheDocument();
    // warmupTime untouched by the rejected pick.
    expect(latestDraft().warmupTime).toMatchObject({ value: 2, unit: PeriodUnit.HOURS });
  });

  it("switching back to Clock clears all three calendar dates", () => {
    // The clean-era engine makes an explicit `startDateTime` a HARD ERROR
    // under `timeMode: "clock"` (`document/clean/root.py`).
    renderCalendar({
      warmupDateTime: localDate("2026-06-01T06:00"),
      finishDateTime: localDate("2026-06-02T08:00"),
    });
    fireEvent.change(screen.getByDisplayValue(SimulationTimeType.CalendarDate), {
      target: { value: SimulationTimeType.Clock },
    });
    const draft = latestDraft();
    expect(draft.timeMode).toBe(SimulationTimeType.Clock);
    expect(draft.startDateTime).toBeNull();
    expect(draft.warmupDateTime).toBeNull();
    expect(draft.finishDateTime).toBeNull();
  });

  it("defaults a model with no runTime to 24 hours, matching Model.createDefault", () => {
    // A 0h fallback silently produced an empty run for a fresh calendar model,
    // where Run Time has no visible input to correct it.
    const model = extractModelData({ id: "m1", name: "New Model" } as any);
    expect(model.runTime).toMatchObject({ value: 24, unit: PeriodUnit.HOURS });
  });
});
