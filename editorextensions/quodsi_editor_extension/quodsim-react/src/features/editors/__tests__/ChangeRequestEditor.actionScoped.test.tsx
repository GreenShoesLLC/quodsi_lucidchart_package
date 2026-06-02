import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChangeRequestEditor from "../ChangeRequestEditor";

// ---------------------------------------------------------------------------
// Fixtures
// activityWithActions:
//   DELAY_WITH_RESOURCE (act-delay)  — has both duration AND resourceRequirementId
//   SEIZE            (act-seize)  — has resourceRequirementId only (no duration)
// ---------------------------------------------------------------------------

const activityWithActions = {
  id: "A1",
  name: "Process",
  actions: [
    {
      id: "act-delay",
      actionType: "DELAY_WITH_RESOURCE",
      duration: {
        durationPeriodUnit: "MINUTES",
        distribution: { distributionType: "constant", parameters: { value: 1 } },
      },
      resourceRequirementId: "rr-1",
    },
    {
      id: "act-seize",
      actionType: "SEIZE",
      resourceRequirementId: "rr-1",
    },
  ],
};

const referenceData = {
  activities: [activityWithActions],
  resourceRequirements: [
    { id: "rr-1", name: "Nurse" },
    { id: "rr-2", name: "Doctor" },
  ],
  generators: [],
  resources: [],
  connectors: [],
};

// ---------------------------------------------------------------------------
// Helper — renders in ACTIVITY / "Process" target state
// ---------------------------------------------------------------------------

function renderEditor(onSave: jest.Mock = jest.fn()) {
  render(
    <ChangeRequestEditor
      referenceData={referenceData as any}
      onSave={onSave}
      onCancel={jest.fn()}
    />
  );
  return onSave;
}

// ---------------------------------------------------------------------------
// A — Action picker + property filtering (property-driven)
// ---------------------------------------------------------------------------

describe("ChangeRequestEditor — action picker (property-driven)", () => {
  it("shows NO Action picker when Property is a capacity property (Activity Capacity)", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "ACTIVITY_CAPACITY" } });
    expect(screen.queryByLabelText("Action")).toBeNull();
  });

  it("shows Action picker after selecting Property=DURATION, listing only actions with duration", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "DURATION" } });

    const actionSelect = screen.getByLabelText("Action") as HTMLSelectElement;
    expect(actionSelect).toBeInTheDocument();

    const opts = Array.from(actionSelect.options).map((o) => o.value).filter(Boolean);
    // DELAY_WITH_RESOURCE has duration → eligible; SEIZE has no duration → excluded
    expect(opts).toContain("act-delay");
    expect(opts).not.toContain("act-seize");
    // No "(activity-level — capacity/queues)" pseudo-item
    const optTexts = Array.from(actionSelect.options).map((o) => o.text);
    expect(optTexts.some((t) => t.includes("activity-level"))).toBe(false);
  });

  it("shows Action picker after selecting Property=RESOURCE_REQUIREMENT, listing only actions with resourceRequirementId", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "RESOURCE_REQUIREMENT" } });

    const actionSelect = screen.getByLabelText("Action") as HTMLSelectElement;
    expect(actionSelect).toBeInTheDocument();

    const opts = Array.from(actionSelect.options).map((o) => o.value).filter(Boolean);
    // Both actions have resourceRequirementId → both eligible
    expect(opts).toContain("act-delay");
    expect(opts).toContain("act-seize");
    // No "(activity-level — capacity/queues)" pseudo-item
    const optTexts = Array.from(actionSelect.options).map((o) => o.text);
    expect(optTexts.some((t) => t.includes("activity-level"))).toBe(false);
  });

  it("resets Action to empty when Property changes", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    // Select DURATION, pick an action
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "DURATION" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "act-delay" } });
    expect((screen.getByLabelText("Action") as HTMLSelectElement).value).toBe("act-delay");
    // Switch to RESOURCE_REQUIREMENT → action should reset
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "RESOURCE_REQUIREMENT" } });
    expect((screen.getByLabelText("Action") as HTMLSelectElement).value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// B — Value sub-forms + handleSave
// ---------------------------------------------------------------------------

describe("ChangeRequestEditor — action value sub-forms + save", () => {
  it("saves an action duration scaleRate with actionId (Property first, then Action)", () => {
    const onSave = renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "DURATION" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "act-delay" } });
    // The multiplier input has id cr-multiplier / label "Duration multiplier"
    fireEvent.change(screen.getByLabelText(/multiplier/i), { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const cr = onSave.mock.calls[0][0];
    expect(cr.actionId).toBe("act-delay");
    expect(cr.modificationDetails).toMatchObject({
      type: "duration",
      propertyName: "DURATION",
      mode: "scaleRate",
      factor: 1.5,
    });
  });

  it("saves a resource-requirement swap with actionId (Property first, then Action)", () => {
    const onSave = renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "RESOURCE_REQUIREMENT" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "act-seize" } });
    fireEvent.change(screen.getByLabelText("Resource Requirement"), { target: { value: "rr-2" } });
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    const cr = onSave.mock.calls[0][0];
    expect(cr.actionId).toBe("act-seize");
    expect(cr.modificationDetails).toMatchObject({
      type: "reference",
      propertyName: "RESOURCE_REQUIREMENT",
      resourceRequirementId: "rr-2",
    });
  });

  it("activity-level numeric change saves without actionId (no Action picker shown)", () => {
    const onSave = renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "ACTIVITY_CAPACITY" } });
    // No Action picker should be visible
    expect(screen.queryByLabelText("Action")).toBeNull();
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    const cr = onSave.mock.calls[0][0];
    expect((cr as any).actionId).toBeUndefined();
    expect(cr.modificationDetails.type).toBe("numeric");
  });

  it("Save is disabled when an action property is chosen but no action selected yet", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "DURATION" } });
    // Action picker visible but no action selected
    expect((screen.getByLabelText("Action") as HTMLSelectElement).value).toBe("");
    expect(
      (screen.getByRole("button", { name: /add|update/i }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C — Edit-mode restore
// ---------------------------------------------------------------------------

describe("ChangeRequestEditor — edit-mode restore", () => {
  const existingRef = {
    id: "cr-1",
    objectType: "ACTIVITY",
    objectMatchCriteria: { name: "Process" },
    actionId: "act-seize",
    modificationDetails: {
      type: "reference",
      propertyName: "RESOURCE_REQUIREMENT",
      resourceRequirementId: "rr-2",
    },
  };

  it("restores an existing reference change request (Property=RESOURCE_REQUIREMENT, Action=act-seize) and re-saves", () => {
    const onSave = jest.fn();
    render(
      <ChangeRequestEditor
        changeRequest={existingRef as any}
        referenceData={referenceData as any}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );
    // Property should show RESOURCE_REQUIREMENT, Action should show act-seize
    expect((screen.getByLabelText("Property") as HTMLSelectElement).value).toBe(
      "RESOURCE_REQUIREMENT"
    );
    expect((screen.getByLabelText("Action") as HTMLSelectElement).value).toBe("act-seize");
    expect((screen.getByLabelText("Resource Requirement") as HTMLSelectElement).value).toBe(
      "rr-2"
    );
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    const cr = onSave.mock.calls[0][0];
    expect(cr.actionId).toBe("act-seize");
    expect(cr.modificationDetails.type).toBe("reference");
    expect(cr.modificationDetails.resourceRequirementId).toBe("rr-2");
  });

  const existingDurDist = {
    id: "cr-2",
    objectType: "ACTIVITY",
    objectMatchCriteria: { name: "Process" },
    actionId: "act-delay",
    modificationDetails: {
      type: "duration",
      propertyName: "DURATION",
      mode: "setDistribution",
      duration: {
        durationPeriodUnit: "MINUTES",
        distribution: { distributionType: "constant", parameters: { value: 3 } },
      },
    },
  };

  it("restores an existing action duration setDistribution change request", () => {
    const onSave = jest.fn();
    render(
      <ChangeRequestEditor
        changeRequest={existingDurDist as any}
        referenceData={referenceData as any}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );
    // Property should show DURATION, Action should show act-delay
    expect((screen.getByLabelText("Property") as HTMLSelectElement).value).toBe("DURATION");
    expect((screen.getByLabelText("Action") as HTMLSelectElement).value).toBe("act-delay");
    // The "Change" mode select should restore to setDistribution (not the default scaleRate)
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    const cr = onSave.mock.calls[0][0];
    expect(cr.actionId).toBe("act-delay");
    expect(cr.modificationDetails).toMatchObject({
      type: "duration",
      propertyName: "DURATION",
      mode: "setDistribution",
    });
  });

  // Reproduces the real running extension, where the React root is wrapped in
  // <React.StrictMode> (src/index.tsx). StrictMode double-invokes mount effects,
  // which consumes skip-once `useRef(true)` cascade-reset guards on the first fire
  // and runs the reset on the second — clobbering the restored target/property/action.
  // This mirrors the exact CR Daniel reported (duration scaleRate ×2 on Process).
  const existingDurScale = {
    id: "cr-3",
    objectType: "ACTIVITY",
    objectMatchCriteria: { name: "Process" },
    actionId: "act-delay",
    modificationDetails: {
      type: "duration",
      propertyName: "DURATION",
      mode: "scaleRate",
      factor: 2,
    },
  };

  it("restores an action duration scaleRate change request under React.StrictMode", () => {
    const onSave = jest.fn();
    render(
      <React.StrictMode>
        <ChangeRequestEditor
          changeRequest={existingDurScale as any}
          referenceData={referenceData as any}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      </React.StrictMode>
    );
    expect((screen.getByLabelText("Target Object") as HTMLSelectElement).value).toBe("Process");
    expect((screen.getByLabelText("Property") as HTMLSelectElement).value).toBe("DURATION");
    expect((screen.getByLabelText("Action") as HTMLSelectElement).value).toBe("act-delay");
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    const cr = onSave.mock.calls[0][0];
    expect(cr.actionId).toBe("act-delay");
    expect(cr.modificationDetails).toMatchObject({
      type: "duration",
      propertyName: "DURATION",
      mode: "scaleRate",
      factor: 2,
    });
  });
});
