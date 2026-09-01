// Complexity Views, Lucid half (Task 11a).
//
// Proves two things:
//   1. Lucid's tab-id -> surface-id maps point at the SAME @quodsi/shared
//      catalog Studio uses, including the ids that genuinely differ from
//      Studio's naming (ActivityEditor's "connectors" tab, GeneratorEditor's
//      "settings"/"events" tabs). ModelEditor's first tab is "basic" in BOTH
//      shells -- the task brief's claim that it is "settings" here does not
//      match this editor's real TAB_CONFIG (that id belongs to
//      GeneratorEditor); this test pins the actual id instead of the brief's
//      guess.
//   2. The gating actually bites in a rendered editor: a tab whose surface is
//      above the current view is absent from the tab strip, and reappears
//      once the view is raised.

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveVisibleSurfaces } from "@quodsi/shared";
import ActivityEditor from "../ActivityEditor";
import GeneratorEditor from "../GeneratorEditor";
import ModelEditor from "../ModelEditor";
import {
  LUCID_ACTIVITY_TAB_SURFACE,
  LUCID_GENERATOR_TAB_SURFACE,
  LUCID_MODEL_TAB_SURFACE,
} from "../viewSurfaceMaps";

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

function setView(view: "basic" | "intermediate" | "advanced") {
  localStorage.setItem("quodsi_view", view);
}

const activityProps = {
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  referenceData: {} as any,
  activity: { id: "a1", name: "Triage", capacity: 1, actions: [], levers: [] } as any,
};

const generatorProps = {
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  referenceData: {} as any,
  generator: { id: "g1", name: "Arrivals", mode: "frequency", levers: [] } as any,
};

const modelProps = {
  model: { id: "m1", name: "My Model", reps: 1, seed: 12345, levers: [] } as any,
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  entities: [],
  onEntitiesChange: vi.fn(),
};

describe("Lucid tab surface maps", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("points at the same surface ids as the Studio shell", () => {
    expect(LUCID_ACTIVITY_TAB_SURFACE.failure).toBe("activity.tab.failure");
    expect(LUCID_ACTIVITY_TAB_SURFACE.basic).toBe("activity.tab.basic");
    // ActivityEditor's routing tab id is "connectors" here, "Routing" in Studio.
    expect(LUCID_ACTIVITY_TAB_SURFACE.connectors).toBe("activity.tab.routing");
    // GeneratorEditor's first tab id is "settings" here, "Basic" in Studio.
    expect(LUCID_GENERATOR_TAB_SURFACE.settings).toBe("generator.tab.basic");
    // GeneratorEditor's "events" tab (initial-state modifications) is Studio's "States".
    expect(LUCID_GENERATOR_TAB_SURFACE.events).toBe("generator.tab.states");
    // ModelEditor's first tab id is "basic" in BOTH shells -- no divergence here,
    // despite the task brief's claim.
    expect(LUCID_MODEL_TAB_SURFACE.basic).toBe("model.tab.basic");
  });

  it("hides the Failure tab in Basic and shows it in Advanced", () => {
    expect(resolveVisibleSurfaces("basic").has(LUCID_ACTIVITY_TAB_SURFACE.failure)).toBe(false);
    expect(resolveVisibleSurfaces("advanced").has(LUCID_ACTIVITY_TAB_SURFACE.failure)).toBe(true);
  });

  it("keeps Levers visible in Basic", () => {
    expect(resolveVisibleSurfaces("basic").has(LUCID_GENERATOR_TAB_SURFACE.levers)).toBe(true);
  });
});

describe("ActivityEditor — view gates the Failure tab", () => {
  beforeEach(() => localStorage.clear());

  it("hides Failure Settings in Basic", () => {
    setView("basic");
    render(<ActivityEditor {...activityProps} />);
    expect(
      screen.queryByRole("button", { name: /Configure activity failure/i })
    ).not.toBeInTheDocument();
  });

  it("shows Failure Settings in Advanced", () => {
    setView("advanced");
    render(<ActivityEditor {...activityProps} />);
    expect(
      screen.getByRole("button", { name: /Configure activity failure/i })
    ).toBeInTheDocument();
  });
});

describe("GeneratorEditor — view gates the Event Modifications tab", () => {
  beforeEach(() => localStorage.clear());

  it("hides Event Modifications in Basic", () => {
    setView("basic");
    render(<GeneratorEditor {...generatorProps} />);
    expect(
      screen.queryByRole("button", { name: /Set initial state values/i })
    ).not.toBeInTheDocument();
  });

  it("shows Event Modifications in Intermediate", () => {
    setView("intermediate");
    render(<GeneratorEditor {...generatorProps} />);
    expect(
      screen.getByRole("button", { name: /Set initial state values/i })
    ).toBeInTheDocument();
  });
});

describe("ModelEditor — view gates the Schedules tab", () => {
  beforeEach(() => localStorage.clear());

  it("hides Schedules in Basic", () => {
    setView("basic");
    render(<ModelEditor {...modelProps} />);
    expect(
      screen.queryByRole("button", { name: /Define work schedules/i })
    ).not.toBeInTheDocument();
  });

  it("shows Schedules in Advanced", () => {
    setView("advanced");
    render(<ModelEditor {...modelProps} />);
    expect(
      screen.getByRole("button", { name: /Define work schedules/i })
    ).toBeInTheDocument();
  });

  it("never gates the diagnostics-only Validation tab", () => {
    setView("basic");
    render(<ModelEditor {...modelProps} />);
    expect(
      screen.getByRole("button", { name: /View comprehensive model validation/i })
    ).toBeInTheDocument();
  });
});
