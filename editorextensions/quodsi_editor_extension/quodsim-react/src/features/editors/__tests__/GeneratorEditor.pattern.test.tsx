import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType } from "@quodsi/lucid-shared";

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

// GeneratorEditor now calls useModelRootSource() directly (Task 10 -- the
// hook is NOT threaded down as a prop from ElementEditor), which talks to
// the extension host via useMessaging()'s panelType plus window.postMessage.
// Mock useMessaging the same way useModelRootSourceHook.test.tsx does; the
// hook's own postMessage plumbing still runs for real against jsdom's
// window, it just never receives a MODEL_ROOT_SNAPSHOT reply in these
// tests, so `projection` stays null throughout -- exercising exactly the
// null-gated paths (summarizeArrivalPattern's `?? []` fallback, the
// lifecycle handlers' `modelRootProjection &&` guard).
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
}));

function patternGenerator() {
  return {
    id: "g1",
    name: "Arrivals",
    mode: GeneratorType.PATTERN,
    arrivalPatternId: "ap-1",
    volume: 8500,
    levers: [],
  } as any;
}

const baseProps = {
  onSave: vi.fn(),
  referenceData: { entities: [] } as any,
  states: {} as any,
  onStatesChange: vi.fn(),
};

describe("GeneratorEditor PATTERN mode", () => {
  it("offers PATTERN in the generator type dropdown", () => {
    render(<GeneratorEditor generator={patternGenerator()} {...baseProps} />);
    const select = screen.getByRole("combobox", { name: /generator type/i });
    expect(select).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /arrival pattern/i })
    ).toBeInTheDocument();
  });

  it("shows a pattern summary instead of the old read-only notice", () => {
    render(<GeneratorEditor generator={patternGenerator()} {...baseProps} />);
    expect(
      screen.queryByText(/authored in Quodsi Studio or the drawio extension/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit pattern/i })
    ).toBeInTheDocument();
  });

  it("opens the pattern modal from the button", () => {
    render(<GeneratorEditor generator={patternGenerator()} {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit pattern/i }));
    expect(
      screen.getByRole("dialog", { name: /arrival pattern/i })
    ).toBeInTheDocument();
  });

  it("still shows the SCHEDULED read-only notice unchanged (byte-unchanged branch, sanity check)", () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-scheduled",
          name: "Appointments",
          mode: GeneratorType.SCHEDULED,
          arrivalScheduleId: "as-456",
          levers: [],
        } as any}
      />
    );

    expect(screen.getByText(/Scheduled Arrival generator/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Quodsi Studio or the drawio extension/i)
    ).toBeInTheDocument();
    // SCHEDULED still has no dropdown and no Edit pattern button.
    expect(
      screen.queryByRole("combobox", { name: /generator type/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit pattern/i })
    ).not.toBeInTheDocument();
  });
});
