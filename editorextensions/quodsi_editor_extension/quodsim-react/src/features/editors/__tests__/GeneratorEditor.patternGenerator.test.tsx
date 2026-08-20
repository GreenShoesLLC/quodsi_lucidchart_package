import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { EnvelopeMessageType, DEFAULT_MODAL_SIZE } from "@quodsi/lucid-shared";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
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
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

// Task 4: a hoisted spy stands in for sendMessage so the OPEN_SCHEDULE_MODAL
// test below can assert on the envelope useSimulationRunSender -> useSender
// build for real -- mirrors GeneratorEditor.pattern.test.tsx's own
// mockSendMessage (see that file's header comment for the full rationale).
// vi.hoisted keeps ONE stable reference the mock factory below can close over.
const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

// Task 10: GeneratorEditor now calls useModelRootSource() directly (talks to
// the extension host via useMessaging()), which every render of this
// component depends on -- mock it the same way GeneratorEditor.pattern.test.tsx
// does. Without this, rendering any generator here (PATTERN or not) throws,
// since useMessaging() has no MessageProvider ancestor in these tests.
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

const baseProps = {
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  referenceData: {} as any,
};

/**
 * Task 10 updated this describe block: Lucid now HAS a Pattern editor
 * (opened via "Edit pattern", as a real Lucid modal the host draws -- see
 * Task 4), so a PATTERN generator no longer renders the old read-only
 * notice -- that notice, and this block's assertions, moved to
 * GeneratorEditor.pattern.test.tsx, which covers the dropdown option, the
 * summary+button replacing the notice, and the OPEN_PATTERN_MODAL send.
 * What's LEFT here is the FREQUENCY control case (unchanged behaviour, kept
 * as a regression guard) and a same-file sanity check that a PATTERN
 * generator's settings tab no longer contains the notice text this file
 * used to assert on.
 */
describe("GeneratorEditor — PATTERN generator (now authored via a host modal, not a read-only notice)", () => {
  it("does NOT render the old read-only notice for a PATTERN generator (moved to GeneratorEditor.pattern.test.tsx)", () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-pattern",
          name: "Arrivals",
          mode: "pattern",
          arrivalPatternId: "ap-123",
          volume: 500,
          levers: [],
        } as any}
      />
    );

    // The old externally-authored notice text must not appear for PATTERN --
    // it is now reserved for SCHEDULED only (see the block below).
    expect(screen.queryByText(/Arrival Pattern generator/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Quodsi Studio or the drawio extension/i)
    ).not.toBeInTheDocument();

    // The FREQUENCY editing surface still must not render for PATTERN — a
    // hidden-but-live control would let auto-save clobber the pattern.
    expect(screen.queryByText(/Time Between Arrivals/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced Settings/i)).not.toBeInTheDocument();

    // PATTERN now DOES get the Generator Type dropdown (Task 10 restored it)
    // plus the "Edit pattern" authoring surface -- see
    // GeneratorEditor.pattern.test.tsx for the full assertions on both.
    expect(screen.getByText(/^Generator Type$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit pattern/i })
    ).toBeInTheDocument();
  });

  it("still renders the FREQUENCY controls for a FREQUENCY generator (control case)", () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-frequency",
          name: "Arrivals",
          mode: "frequency",
          levers: [],
        } as any}
      />
    );

    expect(screen.getByText(/Time Between Arrivals/i)).toBeInTheDocument();
    expect(screen.queryByText(/Arrival Pattern generator/i)).not.toBeInTheDocument();
  });
});

/**
 * Task 4 updated this describe block: Lucid now HAS a Schedule editor
 * (opened via "Edit schedule", as a real Lucid modal the host draws,
 * mirroring PATTERN's own "Edit pattern" from Task 10), so a SCHEDULED
 * generator no longer renders the old read-only notice, and SCHEDULED is
 * back on the type dropdown -- there is no longer a mode the FREQUENCY/
 * PATTERN-only dropdown couldn't represent, so nothing is left off it.
 */
describe("GeneratorEditor — SCHEDULED generator (now authored via a host modal, not a read-only notice)", () => {
  it("does NOT render the old read-only notice for a SCHEDULED generator, and hides the FREQUENCY generation-config controls", () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-scheduled",
          name: "Appointments",
          mode: "scheduled",
          arrivalScheduleId: "as-456",
          levers: [],
        } as any}
      />
    );

    // The old read-only notice text must not appear for SCHEDULED any more.
    expect(screen.queryByText(/Scheduled Arrival generator/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Quodsi Studio or the drawio extension/i)
    ).not.toBeInTheDocument();

    // The FREQUENCY editing surface still must not render for SCHEDULED — a
    // hidden-but-live control would let auto-save clobber the schedule.
    expect(screen.queryByText(/Time Between Arrivals/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced Settings/i)).not.toBeInTheDocument();

    // SCHEDULED now DOES get the Generator Type dropdown (Task 4 restored it,
    // same as PATTERN in Task 10) plus the "Edit schedule" authoring surface
    // -- see the OPEN_SCHEDULE_MODAL test below for the send assertion.
    expect(screen.getByText(/^Generator Type$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit schedule/i })
    ).toBeInTheDocument();
  });

  it("shows the Edit-pattern authoring surface, not the Schedule summary, for a PATTERN generator", () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-pattern-2",
          name: "Arrivals",
          mode: "pattern",
          arrivalPatternId: "ap-789",
          levers: [],
        } as any}
      />
    );

    // Task 10/4: PATTERN shows neither the old PATTERN notice nor the
    // SCHEDULED summary/button -- it gets its own summary + "Edit pattern"
    // button (see GeneratorEditor.pattern.test.tsx).
    expect(screen.queryByText(/Scheduled Arrival generator/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Arrival Pattern generator/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit pattern/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit schedule/i })
    ).not.toBeInTheDocument();
  });

  it("asks the host to open the schedule modal, with the shape id and the modal size preference", () => {
    // Mirrors GeneratorEditor.pattern.test.tsx's identical OPEN_PATTERN_MODAL
    // test: clicking "Edit schedule" routes through the REAL (unmocked)
    // useSimulationRunSender -> useSender -> useMessaging().sendMessage
    // chain -- only the terminal sendMessage is a spy (see the
    // mockSendMessage/MessageProvider mock above) -- so this exercises
    // production code building the OPEN_SCHEDULE_MODAL payload, not a stub.
    mockSendMessage.mockClear();
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-scheduled",
          name: "Appointments",
          mode: "scheduled",
          arrivalScheduleId: "as-456",
          levers: [],
        } as any}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /edit schedule/i }));

    expect(mockSendMessage).toHaveBeenCalledWith(
      EnvelopeMessageType.OPEN_SCHEDULE_MODAL,
      { shapeId: "g-scheduled", modalSize: DEFAULT_MODAL_SIZE }
    );
  });
});
