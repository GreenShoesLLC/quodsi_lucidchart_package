import React from "react";
import { render, screen } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";

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

// Task 10: GeneratorEditor now calls useModelRootSource() directly (talks to
// the extension host via useMessaging()), which every render of this
// component depends on -- mock it the same way GeneratorEditor.pattern.test.tsx
// does. Without this, rendering any generator here (PATTERN or not) throws,
// since useMessaging() has no MessageProvider ancestor in these tests.
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
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
 * SCHEDULED generators need the same edit gate PATTERN generators got: Lucid
 * has no Schedule editor either, and the FREQUENCY surface rendering for one
 * is a live corruption path -- the type <select> shows blank (value
 * "scheduled", only option "frequency") and one click rewrites mode, orphaning
 * arrivalScheduleId.
 */
describe("GeneratorEditor — SCHEDULED generator (read-only notice)", () => {
  it("renders a read-only notice and hides the FREQUENCY generation-config controls", () => {
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

    expect(screen.getByText(/Scheduled Arrival generator/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Quodsi Studio or the drawio extension/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/as-456/)).toBeInTheDocument();

    // The FREQUENCY editing surface must not render at all — a hidden-but-live
    // control would still let auto-save clobber the schedule on blur/interval.
    expect(screen.queryByText(/Time Between Arrivals/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced Settings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Generator Type$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Frequency-Based/i)).not.toBeInTheDocument();
  });

  it("shows the Edit-pattern authoring surface, not the Schedule notice, for a PATTERN generator", () => {
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

    // Task 10: PATTERN no longer shows either amber notice -- it gets the
    // summary + "Edit pattern" button (see GeneratorEditor.pattern.test.tsx).
    expect(screen.queryByText(/Scheduled Arrival generator/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Arrival Pattern generator/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit pattern/i })
    ).toBeInTheDocument();
  });
});
