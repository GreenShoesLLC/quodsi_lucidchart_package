// Complexity Views, Lucid half (Task 11a).
//
// Every Lucid editor is now Studio's shared one (Model: spec 2026-09-13;
// Generator and Activity: specs 2026-09-14), so their tab gating is Studio's
// and is tested there. What this file still proves, in Lucid's own host (the
// shared ModelEditor over the real model-root source):
//   1. The gating actually bites: a tab or field whose surface is above the
//      current view is absent, and reappears once the view is raised.
//   2. THE TELL actually renders when a view-hidden surface is genuinely in
//      use -- review round 1 caught that ModelEditor's ViewTell mount passed
//      ctx={{ element: localModelDraft }} while every model-level predicate
//      in @quodsi/shared reads ctx.model, so surfacesInUse was always empty
//      and the tell was structurally dead code no assertion here would have
//      caught. These tests render a model that actually uses a hidden
//      surface and assert role="note" appears.

import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { definition, mountModelEditor } from "./modelEditorSeam";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
    updateElement: vi.fn(),
  }),
}));

// The Model editor's model-root source reads useMessaging() for its panelType;
// without this, mounting throws (no MessageProvider ancestor here).
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
}));

function setView(view: "basic" | "intermediate" | "advanced") {
  localStorage.setItem("quodsi_view", view);
}

describe("The tell: never silently hide live behaviour", () => {
  beforeEach(() => localStorage.clear());

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
  // The shared BasicSettingsTab gates these; this pins it in Lucid's host
  // (spec 2026-09-13). Hiding a field writes nothing; the model.field.*
  // surfaces are in the shared MODEL_EXTRA_SURFACES so the tell can explain a
  // non-default one.
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
    expect(screen.queryByRole("tab", { name: "Schedules" })).not.toBeInTheDocument();
  });

  it("shows Schedules in Advanced", () => {
    setView("advanced");
    mountModelEditor();
    expect(screen.getByRole("tab", { name: "Schedules" })).toBeInTheDocument();
  });

  it("never gates the diagnostics-only Validation tab", () => {
    setView("basic");
    mountModelEditor();
    expect(screen.getByRole("tab", { name: "Validation" })).toBeInTheDocument();
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
