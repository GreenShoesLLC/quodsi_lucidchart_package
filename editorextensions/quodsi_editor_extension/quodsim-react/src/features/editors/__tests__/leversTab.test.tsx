// The "Levers" tab in the Lucid editors (2026-08-31).
//
// Lucid adopts the shape drawio/Studio shipped first: levers move off the
// Basic/Settings tab onto their own, with a count badge on the icon-only tab
// strip. At the same time Lucid deleted its near-verbatim fork of
// LeverAuthoringSection for the monorepo original, which brings three fixes the
// fork never had -- the work-schedule hiddenProperties rule, a badge that counts
// only what the section offers, and theme tokens instead of raw Tailwind.
//
// What this pins, beyond "the tab exists":
//   - the badge counts, and is aria-hidden so it can't become the icon-only
//     button's whole accessible name;
//   - a SCHEDULED generator gets NO tab -- every property offered to a GENERATOR
//     is FREQUENCY- or PATTERN-only, so its checkboxes would author levers the
//     engine ignores. Lucid offered them before this change;
//   - an activity following a work schedule loses its capacity lever but keeps
//     the tab. Lucid offered that lever before this change too.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityEditor from "../ActivityEditor";
import GeneratorEditor from "../GeneratorEditor";

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
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

// GeneratorEditor calls useModelRootSource(), which needs useMessaging() for its
// panelType; without this, render() throws (no MessageProvider ancestor here).
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
}));

// The tab strip is icon-only, so `title` is the accessible name -- every Lucid tab
// is selected by its tooltip text.
const LEVERS_TAB_NAME = /mark .* as a scenario lever/i;

const activityProps = {
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  referenceData: {} as any,
};

const generatorProps = {
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  referenceData: {} as any,
};

const capacityLever = {
  leverId: "lv-cap",
  propertyName: "ACTIVITY_CAPACITY",
  enabled: true,
  label: "Beds",
  range: { min: 1, max: 5, step: 1 },
};

describe("ActivityEditor — Levers tab badge", () => {
  it("badges the tab with the authored lever count", () => {
    render(
      <ActivityEditor
        {...activityProps}
        activity={
          { id: "a1", name: "Triage", capacity: 1, actions: [], levers: [capacityLever] } as any
        }
      />
    );
    expect(screen.getByTestId("tab-badge-levers")).toHaveTextContent("1");
  });

  it("shows no badge when nothing is authored", () => {
    render(
      <ActivityEditor
        {...activityProps}
        activity={{ id: "a1", name: "Triage", capacity: 1, actions: [], levers: [] } as any}
      />
    );
    expect(screen.queryByTestId("tab-badge-levers")).not.toBeInTheDocument();
  });

  it("keeps the badge out of the tab's accessible name", () => {
    // The buttons render only an icon, so an unhidden badge would be the sole text
    // content and would become the whole accessible name -- breaking the
    // tooltip-based selection every other Lucid tab test relies on.
    render(
      <ActivityEditor
        {...activityProps}
        activity={
          { id: "a1", name: "Triage", capacity: 1, actions: [], levers: [capacityLever] } as any
        }
      />
    );
    expect(screen.getByTestId("tab-badge-levers")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: LEVERS_TAB_NAME })).toBeInTheDocument();
  });
});

describe("ActivityEditor — work-schedule capacity rule (new to Lucid)", () => {
  it("hides the Activity Capacity lever once the activity follows a schedule, keeping the tab", () => {
    render(
      <ActivityEditor
        {...activityProps}
        activity={
          {
            id: "a1",
            name: "Triage",
            capacity: 1,
            workScheduleId: "ws-nt",
            actions: [],
            levers: [],
          } as any
        }
      />
    );
    fireEvent.click(screen.getByRole("button", { name: LEVERS_TAB_NAME }));

    expect(
      screen.queryByLabelText(/use Activity Capacity as a scenario lever/i)
    ).not.toBeInTheDocument();
    // The queue-capacity levers are unaffected, so the tab still has work to do.
    expect(
      screen.getByLabelText(/use Inbound Queue Capacity as a scenario lever/i)
    ).toBeInTheDocument();
  });

  it("does not count a capacity lever the section refuses to show", () => {
    render(
      <ActivityEditor
        {...activityProps}
        activity={
          {
            id: "a1",
            name: "Triage",
            capacity: 1,
            workScheduleId: "ws-nt",
            actions: [],
            levers: [capacityLever],
          } as any
        }
      />
    );
    expect(screen.queryByTestId("tab-badge-levers")).not.toBeInTheDocument();
  });
});

describe("GeneratorEditor — Levers tab is mode-dependent (new to Lucid)", () => {
  it("offers the tab for a Rate generator", () => {
    render(
      <GeneratorEditor
        {...generatorProps}
        generator={{ id: "g1", name: "Arrivals", mode: "frequency", levers: [] } as any}
      />
    );
    expect(screen.getByRole("button", { name: LEVERS_TAB_NAME })).toBeInTheDocument();
  });

  it("offers the tab for a Pattern generator", () => {
    render(
      <GeneratorEditor
        {...generatorProps}
        generator={{ id: "g1", name: "Arrivals", mode: "pattern", volume: 1000, levers: [] } as any}
      />
    );
    expect(screen.getByRole("button", { name: LEVERS_TAB_NAME })).toBeInTheDocument();
  });

  it("withholds the tab from a Scheduled generator", () => {
    render(
      <GeneratorEditor
        {...generatorProps}
        generator={{ id: "g1", name: "Arrivals", mode: "scheduled", levers: [] } as any}
      />
    );
    expect(screen.queryByRole("button", { name: LEVERS_TAB_NAME })).not.toBeInTheDocument();
    expect(screen.queryByTestId("lever-authoring")).not.toBeInTheDocument();
  });
});
