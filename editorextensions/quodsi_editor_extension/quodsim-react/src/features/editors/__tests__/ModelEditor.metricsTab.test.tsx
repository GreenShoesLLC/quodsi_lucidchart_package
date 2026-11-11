// The shared Model editor's Metrics tab in Lucid's host (spec 2026-11-10
// custom metrics, Task 11): the tab shows at Intermediate, and creating a
// cycle-time metric writes through the REAL LucidModelStateAccessor (only the
// transport is faked, see modelEditorSeam): the states, each touched
// activity's actions, then the record.
import { screen, fireEvent, act, cleanup } from "@testing-library/react";
import { setView } from "quodsi_studio/platforms/shared";
import { defaultNames, planCycleTimeMetric, toMetricModelView, type ModelDefinition } from "@quodsi/shared";
import { definition, mountModelEditor } from "./modelEditorSeam";

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, selection: {}, sendMessage: vi.fn() }),
}));

function metricsDefinition() {
  return definition({
    activities: [
      { id: "act-t", name: "Triage", actions: [] },
      { id: "act-d", name: "Discharge", actions: [] },
    ],
    entities: [{ id: "e-p", name: "Patient" }],
  });
}

/** The page as the host projects it once a metric has been stored on it. */
function storedMetricDefinition() {
  const base = metricsDefinition();
  const plan = planCycleTimeMetric(toMetricModelView(base as ModelDefinition), {
    name: "TriageToDischarge",
    answers: { startActivityId: "act-t", startTiming: "starts", stopActivityId: "act-d", stopTiming: "finishes", entityTypeId: "e-p" },
    names: defaultNames("TriageToDischarge"),
  });
  return definition({
    states: plan.states.map((s) => s.toJSON() as unknown as Record<string, unknown>),
    activities: [
      { id: "act-t", name: "Triage", actions: plan.activityActions["act-t"] as unknown as Array<Record<string, unknown>> },
      { id: "act-d", name: "Discharge", actions: plan.activityActions["act-d"] as unknown as Array<Record<string, unknown>> },
    ],
    entities: [{ id: "e-p", name: "Patient" }],
    model: { customMetrics: JSON.parse(JSON.stringify(plan.customMetrics)) },
  });
}

describe("Model editor — Metrics tab in Lucid", () => {
  beforeEach(() => setView("intermediate"));
  afterEach(() => { cleanup(); setView("basic"); });

  it("shows the Metrics tab and creates a metric through the Lucid accessor", async () => {
    const { transport, source } = mountModelEditor(metricsDefinition());

    fireEvent.click(screen.getByRole("tab", { name: "Metrics" }));
    fireEvent.click(screen.getByRole("button", { name: "+ New custom metric" }));
    fireEvent.click(screen.getByRole("button", { name: /Cycle time between two activities/ }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "TriageToDischarge" } });
    fireEvent.click(screen.getByRole("button", { name: "Create metric" }));

    await act(async () => {
      await source.flush();
    });

    const sent = transport.send.mock.calls.map((c) => c[0] as Record<string, unknown>);
    const merged = Object.assign({}, ...sent) as {
      states?: Array<{ name: string }>;
      customMetrics?: Array<{ name: string; answers: { entityTypeId: string | null } }>;
    };
    expect(merged.states?.map((s) => s.name).sort()).toEqual(Object.values(defaultNames("TriageToDischarge")).sort());
    expect(merged.customMetrics).toHaveLength(1);
    expect(merged.customMetrics![0]).toMatchObject({ name: "TriageToDischarge", answers: { entityTypeId: null } });

    // Each activity's new actions ride the same model-root update as shape writes.
    const shapes = transport.send.mock.calls.flatMap((c) => (c[4] ?? []) as Array<{ shapeId: string; type: string; patch: { actions?: Array<{ id: string }> } }>);
    expect(shapes.map((w) => [w.shapeId, w.type])).toEqual([["act-t", "Activity"], ["act-d", "Activity"]]);
    const metric = merged.customMetrics![0] as unknown as { actionIds: { start: string; stop: string } };
    expect(shapes[0].patch.actions?.map((a) => a.id)).toContain(metric.actionIds.start);
    expect(shapes[1].patch.actions?.map((a) => a.id)).toContain(metric.actionIds.stop);
    expect(transport.saveShape).not.toHaveBeenCalled();
  });

  it("lists a metric stored on the page", () => {
    mountModelEditor(storedMetricDefinition());

    fireEvent.click(screen.getByRole("tab", { name: "Metrics" }));
    expect(screen.getByRole("button", { name: "Open TriageToDischarge" })).toBeInTheDocument();
  });
});
