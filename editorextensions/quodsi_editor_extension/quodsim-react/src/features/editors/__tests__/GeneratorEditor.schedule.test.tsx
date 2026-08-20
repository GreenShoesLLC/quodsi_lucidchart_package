import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType, EnvelopeMessageType, PeriodUnit } from "@quodsi/lucid-shared";

// Same mocking setup as GeneratorEditor.pattern.test.tsx's "populated
// projection" describe block -- read/follow that file's harness rather than
// inventing a second mechanism. summarizeArrivalSchedule (GeneratorEditor.tsx)
// only ever runs once modelRootProjection is non-null; every SCHEDULED test
// elsewhere in this codebase renders with modelRootProjection === null (the
// "Loading schedule…" placeholder), so it has zero executed coverage without
// this file.
const { mockUpdateElementData, mockSelectElement, mockSendMessage } = vi.hoisted(() => ({
  mockUpdateElementData: vi.fn(),
  mockSelectElement: vi.fn(),
  mockSendMessage: vi.fn(),
}));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: mockSelectElement,
    updateElementData: mockUpdateElementData,
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

vi.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

const baseProps = {
  onSave: vi.fn(),
  referenceData: { entities: [] } as any,
  states: {} as any,
  onStatesChange: vi.fn(),
};

function scheduledGenerator(overrides: Record<string, unknown> = {}) {
  return {
    id: "g-sched",
    name: "Appointments",
    mode: GeneratorType.SCHEDULED,
    arrivalScheduleId: "as-1",
    levers: [],
    ...overrides,
  } as any;
}

/** Mirrors GeneratorEditor.pattern.test.tsx's dispatchSnapshot exactly --
 *  simulates the host pushing a MODEL_ROOT_SNAPSHOT (in reply to the
 *  request useModelRootSource fires on mount). */
function dispatchSnapshot(projection: Record<string, unknown>) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          id: "snapshot-push",
          type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
          source: "host",
          target: "model-iframe",
          version: "1.0",
          data: { projection },
        },
      })
    );
  });
}

describe("GeneratorEditor SCHEDULED mode — summary reflects a populated projection", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
    mockSendMessage.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the arrival count and time range for several arrivals", () => {
    render(<GeneratorEditor {...baseProps} generator={scheduledGenerator()} />);

    dispatchSnapshot({
      generators: [{ id: "g-sched", name: "Appointments", mode: "scheduled", arrivalScheduleId: "as-1" }],
      arrivalPatterns: [],
      arrivalSchedules: [
        {
          id: "as-1",
          name: "Appointments schedule",
          timeUnit: PeriodUnit.MINUTES,
          arrivals: [{ time: 0 }, { time: 240 }, { time: 480 }],
        },
      ],
      model: {},
    });

    expect(screen.queryByText(/Loading schedule/i)).not.toBeInTheDocument();
    expect(screen.getByText(/3 arrivals, 0 to 480 minutes/i)).toBeInTheDocument();
  });

  it("pins the singular wording for exactly one arrival", () => {
    render(<GeneratorEditor {...baseProps} generator={scheduledGenerator()} />);

    dispatchSnapshot({
      generators: [{ id: "g-sched", name: "Appointments", mode: "scheduled", arrivalScheduleId: "as-1" }],
      arrivalPatterns: [],
      arrivalSchedules: [
        {
          id: "as-1",
          name: "Appointments schedule",
          timeUnit: PeriodUnit.MINUTES,
          arrivals: [{ time: 100 }],
        },
      ],
      model: {},
    });

    // "1 arrival", not "1 arrivals" -- and since there is only one arrival,
    // min === max, so no "X to X" range: just the single time.
    expect(screen.getByText(/^1 arrival, 100 minutes$/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 arrivals/i)).not.toBeInTheDocument();
  });

  it("collapses the range to a single time when every arrival shares the same time", () => {
    render(<GeneratorEditor {...baseProps} generator={scheduledGenerator()} />);

    dispatchSnapshot({
      generators: [{ id: "g-sched", name: "Appointments", mode: "scheduled", arrivalScheduleId: "as-1" }],
      arrivalPatterns: [],
      arrivalSchedules: [
        {
          id: "as-1",
          name: "Appointments schedule",
          timeUnit: PeriodUnit.MINUTES,
          arrivals: [{ time: 60 }, { time: 60 }],
        },
      ],
      model: {},
    });

    // min === max (60 === 60): rangeLabel collapses to "60", not "60 to 60".
    expect(screen.getByText(/^2 arrivals, 60 minutes$/i)).toBeInTheDocument();
    expect(screen.queryByText(/60 to 60/i)).not.toBeInTheDocument();
  });

  it("reports 0 arrivals for a real schedule with no arrival rows (that IS a measurement)", () => {
    render(<GeneratorEditor {...baseProps} generator={scheduledGenerator()} />);

    dispatchSnapshot({
      generators: [{ id: "g-sched", name: "Appointments", mode: "scheduled", arrivalScheduleId: "as-1" }],
      arrivalPatterns: [],
      arrivalSchedules: [
        { id: "as-1", name: "Appointments schedule", timeUnit: PeriodUnit.MINUTES, arrivals: [] },
      ],
      model: {},
    });

    expect(screen.getByText(/^0 arrivals$/i)).toBeInTheDocument();
    expect(screen.queryByText(/No schedule yet/i)).not.toBeInTheDocument();
  });

  it('shows "No schedule yet" when arrivalScheduleId is unset -- distinct from a real 0-arrival schedule', () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={scheduledGenerator({ arrivalScheduleId: undefined })}
      />
    );

    dispatchSnapshot({
      generators: [{ id: "g-sched", name: "Appointments", mode: "scheduled" }],
      arrivalPatterns: [],
      arrivalSchedules: [],
      model: {},
    });

    expect(screen.getByText(/No schedule yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 arrivals/i)).not.toBeInTheDocument();
  });

  it('shows "No schedule yet" when arrivalScheduleId points at a schedule that no longer resolves', () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={scheduledGenerator({ arrivalScheduleId: "as-deleted" })}
      />
    );

    dispatchSnapshot({
      generators: [{ id: "g-sched", name: "Appointments", mode: "scheduled", arrivalScheduleId: "as-deleted" }],
      arrivalPatterns: [],
      // The linked schedule is gone from the list -- e.g. deleted elsewhere.
      arrivalSchedules: [],
      model: {},
    });

    expect(screen.getByText(/No schedule yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 arrivals/i)).not.toBeInTheDocument();
  });

  it("formats calendar-mode arrival times as-is, with no unit suffix", () => {
    render(<GeneratorEditor {...baseProps} generator={scheduledGenerator()} />);

    dispatchSnapshot({
      generators: [{ id: "g-sched", name: "Appointments", mode: "scheduled", arrivalScheduleId: "as-1" }],
      arrivalPatterns: [],
      arrivalSchedules: [
        {
          id: "as-1",
          name: "Appointments schedule",
          arrivals: [
            { time: "2026-01-01T08:00:00" },
            { time: "2026-01-01T09:30:00" },
          ],
        },
      ],
      model: { timeMode: "calendar" },
    });

    expect(
      screen.getByText(/^2 arrivals, 2026-01-01T08:00:00 to 2026-01-01T09:30:00$/i)
    ).toBeInTheDocument();
  });
  /**
   * The min === max collapse is written TWICE in summarizeArrivalSchedule --
   * once inside the calendar-mode branch (string compare) and once in the
   * clock-mode branch (numeric). The clock-mode copy is pinned by the
   * "same time" test above; this pins the calendar-mode one, so deleting
   * either collapse fails a test rather than only the one that happens to
   * be covered.
   */
  it("collapses the calendar-mode range when every arrival shares a timestamp", () => {
    render(<GeneratorEditor {...baseProps} generator={scheduledGenerator()} />);

    dispatchSnapshot({
      generators: [{ id: "g-sched", name: "Appointments", mode: "scheduled", arrivalScheduleId: "as-1" }],
      arrivalPatterns: [],
      arrivalSchedules: [
        {
          id: "as-1",
          name: "Appointments schedule",
          arrivals: [
            { time: "2026-01-01T08:00:00" },
            { time: "2026-01-01T08:00:00" },
          ],
        },
      ],
      model: { timeMode: "calendar" },
    });

    expect(
      screen.getByText(/^2 arrivals, 2026-01-01T08:00:00$/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/ to /i)).not.toBeInTheDocument();
  });
});
