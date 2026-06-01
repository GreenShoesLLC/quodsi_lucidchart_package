import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChangeRequestEditor from "../ChangeRequestEditor";

// ---------------------------------------------------------------------------
// Fixtures
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
// A — Action picker + property filtering
// ---------------------------------------------------------------------------

describe("ChangeRequestEditor — action picker", () => {
  it("shows an Action picker when objectType=ACTIVITY and a target is chosen", () => {
    renderEditor();
    // Target Object is auto-populated; change to 'Process' to be explicit.
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    expect(screen.getByLabelText("Action")).toBeInTheDocument();
    expect(screen.getByText(/Delay with Resource/i)).toBeInTheDocument();
  });

  it("filters Property by the selected action type", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });

    // Select SEIZE action (only RESOURCE_REQUIREMENT, no DURATION)
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "act-seize" } });
    const opts = Array.from(
      (screen.getByLabelText("Property") as HTMLSelectElement).options
    )
      .map((o) => o.value)
      .filter(Boolean);
    expect(opts).toContain("RESOURCE_REQUIREMENT");
    expect(opts).not.toContain("DURATION");

    // Switch to DELAY_WITH_RESOURCE action (has DURATION + RESOURCE_REQUIREMENT)
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "act-delay" } });
    const opts2 = Array.from(
      (screen.getByLabelText("Property") as HTMLSelectElement).options
    )
      .map((o) => o.value)
      .filter(Boolean);
    expect(opts2).toContain("DURATION");
    expect(opts2).toContain("RESOURCE_REQUIREMENT");
  });

  it("activity-level option offers capacity properties (no action)", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    // Select activity-level (empty actionId)
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "" } });
    const opts = Array.from(
      (screen.getByLabelText("Property") as HTMLSelectElement).options
    )
      .map((o) => o.value)
      .filter(Boolean);
    expect(opts).toContain("ACTIVITY_CAPACITY");
    expect(opts).not.toContain("DURATION");
  });
});

// ---------------------------------------------------------------------------
// B — Value sub-forms + handleSave
// ---------------------------------------------------------------------------

describe("ChangeRequestEditor — action value sub-forms + save", () => {
  it("saves an action duration scaleRate with actionId", () => {
    const onSave = renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "act-delay" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "DURATION" } });
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

  it("saves a resource-requirement swap with actionId", () => {
    const onSave = renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "act-seize" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "RESOURCE_REQUIREMENT" } });
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

  it("activity-level numeric change still saves without actionId", () => {
    const onSave = renderEditor();
    fireEvent.change(screen.getByLabelText("Target Object"), { target: { value: "Process" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "ACTIVITY_CAPACITY" } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    const cr = onSave.mock.calls[0][0];
    expect((cr as any).actionId).toBeUndefined();
    expect(cr.modificationDetails.type).toBe("numeric");
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

  it("restores an existing reference change request and re-saves as reference", () => {
    const onSave = jest.fn();
    render(
      <ChangeRequestEditor
        changeRequest={existingRef as any}
        referenceData={referenceData as any}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );
    expect((screen.getByLabelText("Action") as HTMLSelectElement).value).toBe("act-seize");
    expect((screen.getByLabelText("Property") as HTMLSelectElement).value).toBe(
      "RESOURCE_REQUIREMENT"
    );
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
    expect((screen.getByLabelText("Action") as HTMLSelectElement).value).toBe("act-delay");
    expect((screen.getByLabelText("Property") as HTMLSelectElement).value).toBe("DURATION");
    // Save should emit setDistribution (not the default scaleRate)
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    const cr = onSave.mock.calls[0][0];
    expect(cr.actionId).toBe("act-delay");
    expect(cr.modificationDetails).toMatchObject({
      type: "duration",
      propertyName: "DURATION",
      mode: "setDistribution",
    });
  });
});
