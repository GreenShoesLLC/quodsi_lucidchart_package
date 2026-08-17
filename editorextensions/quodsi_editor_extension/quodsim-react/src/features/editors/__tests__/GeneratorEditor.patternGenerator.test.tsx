// @quodsi/lucid-shared (pulled in transitively) loads shared/dist/services/
// lucidApi.js -> axios ESM, which CRA's Jest transformer can't parse.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";

jest.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: jest.fn(),
    updateElementData: jest.fn(),
  }),
}));

jest.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

jest.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: jest.fn() }),
  useFlushOnChange: () => {},
}));

jest.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

const baseProps = {
  onSave: jest.fn(),
  states: {} as any,
  onStatesChange: jest.fn(),
  referenceData: {} as any,
};

/**
 * Task 21: Lucid has no Pattern editor, so a generator authored as PATTERN in
 * Studio or drawio must render as a read-only notice here, never as an
 * editable Rate (FREQUENCY) generator — the judgement call the whole task
 * turned on. These tests assert the notice is a real edit gate: the
 * generation-config controls (Generator Type select, interarrival Duration
 * editor, Advanced Settings) are absent, not just visually secondary.
 */
describe("GeneratorEditor — PATTERN generator (read-only notice)", () => {
  it("renders a read-only notice and hides the FREQUENCY generation-config controls", () => {
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

    // The read-only notice is present, naming where the pattern is authored.
    expect(screen.getByText(/Arrival Pattern generator/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Quodsi Studio or the drawio extension/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/ap-123/)).toBeInTheDocument();
    expect(screen.getByText(/Volume: 500/i)).toBeInTheDocument();

    // The FREQUENCY editing surface must not render at all — a hidden-but-live
    // control would still let auto-save clobber the pattern on blur/interval.
    expect(screen.queryByText(/Time Between Arrivals/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced Settings/i)).not.toBeInTheDocument();
    // "Generator Type" (the select's label) and "Frequency-Based" (its only
    // option) both live inside the `!isPatternGenerator` block; their absence
    // confirms that block did not render, not just that it's visually hidden.
    expect(screen.queryByText(/^Generator Type$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Frequency-Based/i)).not.toBeInTheDocument();
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
