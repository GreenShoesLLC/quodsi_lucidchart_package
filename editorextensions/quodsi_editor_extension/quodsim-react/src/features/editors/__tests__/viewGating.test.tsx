// Complexity Views, Lucid half (Task 11a).
//
// Proves three things:
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
//   3. THE TELL actually renders when a view-hidden surface is genuinely in
//      use -- review round 1 caught that ModelEditor's ViewTell mount passed
//      ctx={{ element: localModelDraft }} while every model-level predicate
//      in @quodsi/shared reads ctx.model, so surfacesInUse was always empty
//      and the tell was structurally dead code no assertion here would have
//      caught. These tests render an element/model that actually uses a
//      hidden surface and assert role="note" appears.

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { resolveVisibleSurfaces } from "@quodsi/shared";
import ActivityEditor from "../ActivityEditor";
import GeneratorEditor from "../GeneratorEditor";
import { definition, mountModelEditor } from "./modelEditorSeam";
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
  referenceData: {} as any,
  activity: { id: "a1", name: "Triage", capacity: 1, actions: [], levers: [] } as any,
};

const generatorProps = {
  onSave: vi.fn(),
  states: {} as any,
  referenceData: {} as any,
  generator: { id: "g1", name: "Arrivals", mode: "frequency", levers: [] } as any,
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

describe("The tell: never silently hide live behaviour", () => {
  beforeEach(() => localStorage.clear());

  it("ActivityEditor: shows the tell when Failure is configured but hidden in Basic", () => {
    setView("basic");
    render(
      <ActivityEditor
        {...activityProps}
        activity={
          {
            id: "a1",
            name: "Triage",
            capacity: 1,
            actions: [],
            levers: [],
            failureProperties: { enabled: true },
          } as any
        }
      />
    );
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/failures/i);
    expect(note).toHaveTextContent(/hidden in Basic/i);
  });

  it("ActivityEditor: shows no tell when Failure is not configured", () => {
    setView("basic");
    render(<ActivityEditor {...activityProps} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("GeneratorEditor: shows the tell when initial states are configured but hidden in Basic", () => {
    setView("basic");
    render(
      <GeneratorEditor
        {...generatorProps}
        generator={
          {
            id: "g1",
            name: "Arrivals",
            mode: "frequency",
            levers: [],
            initialStates: [{ stateId: "s1", value: 1 }],
          } as any
        }
      />
    );
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/initial states/i);
  });

  it("ModelEditor: shows the tell when the model has states but States is hidden in Basic", () => {
    setView("basic");
    mountModelEditor(
      definition({ states: [{ id: "unit_price_MODEL_1", name: "unit_price", componentType: "model", dataType: "number", initialValue: 0 }] })
    );
    expect(screen.getByRole("note")).toHaveTextContent(/states/i);
  });

  it("ModelEditor: shows the tell when the model has resources but Resources is hidden in Basic", () => {
    setView("basic");
    mountModelEditor(definition({ resources: [{ id: "r1", name: "Nurse" }] }));
    expect(screen.getByRole("note")).toHaveTextContent(/resources/i);
  });

  // spec 2026-09-12 decision 9: the snapshot now carries arrival patterns and
  // work schedules to the editor itself, so their tells are on, as in Studio.
  it("ModelEditor: shows the tell when the model has arrival patterns but Arrivals is hidden", () => {
    setView("basic");
    mountModelEditor(definition({ arrivalPatterns: [{ id: "ap-1", name: "Morning rush" }] }));
    expect(screen.getByRole("note")).toHaveTextContent(/arrival/i);
  });

  it("ModelEditor: shows the tell when the model has work schedules but Schedules is hidden", () => {
    setView("basic");
    mountModelEditor(definition({ workSchedules: [{ id: "ws-1", name: "Nursing team" }] }));
    expect(screen.getByRole("note")).toHaveTextContent(/schedule/i);
  });

  it("ModelEditor: shows no tell for a model at the shared defaults with nothing hidden in use", () => {
    setView("basic");
    // definition() defaults to 10 replications, minutes, clock, no warmup.
    mountModelEditor();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("ModelEditor — view gates the model-level FIELDS", () => {
  // Lucid renders its own copies of these controls, so the shared package's
  // gating does not reach them -- Lucid-local proof. Hiding a field writes
  // nothing; the model.field.* surfaces are in LUCID_MODEL_EXTRA_SURFACES so
  // the tell can explain a non-default one.
  beforeEach(() => localStorage.clear());

  it("hides Replications, Time Mode, Clock Unit and Warmup in Basic", () => {
    setView("basic");
    // No accordion in Basic (every control in it is intermediate).
    mountModelEditor();
    expect(screen.queryByTestId("reps-input")).not.toBeInTheDocument();
    expect(screen.queryByText("Time Mode")).not.toBeInTheDocument();
    expect(screen.queryByText("Clock Unit")).not.toBeInTheDocument();
    expect(screen.queryByText("Warmup Time")).not.toBeInTheDocument();
  });

  it("shows all four in Intermediate", () => {
    setView("intermediate");
    // All four live inside the DEFAULT-COLLAPSED accordion: open it first.
    mountModelEditor();
    fireEvent.click(screen.getByText("Advanced Settings"));
    expect(screen.getByTestId("reps-input")).toBeInTheDocument();
    expect(screen.getByText("Time Mode")).toBeInTheDocument();
    expect(screen.getByText("Clock Unit")).toBeInTheDocument();
    expect(screen.getByText("Warmup Time")).toBeInTheDocument();
  });

  it("keeps Run Time visible in Basic", () => {
    setView("basic");
    mountModelEditor();
    expect(screen.getByText("Run Time")).toBeInTheDocument();
  });
});

describe("ModelEditor — view gates the Schedules tab", () => {
  beforeEach(() => localStorage.clear());

  it("hides Schedules in Basic", () => {
    setView("basic");
    mountModelEditor();
    expect(screen.queryByRole("button", { name: /Define work schedules/i })).not.toBeInTheDocument();
  });

  it("shows Schedules in Advanced", () => {
    setView("advanced");
    mountModelEditor();
    expect(screen.getByRole("button", { name: /Define work schedules/i })).toBeInTheDocument();
  });

  it("never gates the diagnostics-only Validation tab", () => {
    setView("basic");
    mountModelEditor();
    expect(screen.getByRole("button", { name: /View comprehensive model validation/i })).toBeInTheDocument();
  });

  // Daniel's Lucid smoke, 2026-09-04: Basic showed an "Advanced Settings"
  // disclosure that opened onto nothing. Studio's BasicSettingsTab drops it.
  it("ModelEditor: hides the empty Advanced Settings accordion in Basic, shows it in Intermediate", () => {
    setView("basic");
    const basic = mountModelEditor();
    expect(screen.queryByRole("button", { name: /advanced settings/i })).not.toBeInTheDocument();
    basic.unmount();

    setView("intermediate");
    mountModelEditor();
    expect(screen.getByRole("button", { name: /advanced settings/i })).toBeInTheDocument();
  });
});
