import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScenarioObjectType } from "@quodsi/shared";
import ChangeRequestEditor from "../ChangeRequestEditor";

// Generator whose current inter-arrival distribution IS rate-scalable.
const genExponential = {
  id: "g1",
  name: "Arrivals",
  periodIntervalDuration: {
    durationPeriodUnit: "MINUTES",
    distribution: { distributionType: "exponential", parameters: { scale: 10 }, description: "" },
  },
};

// Generator whose current distribution is NOT rate-scalable (beta).
const genBeta = {
  id: "g2",
  name: "BetaArrivals",
  periodIntervalDuration: {
    durationPeriodUnit: "MINUTES",
    distribution: { distributionType: "beta", parameters: { alpha: 2, beta: 3 }, description: "" },
  },
};

function renderEditor(generators: any[], onSave: jest.Mock = jest.fn()) {
  render(
    <ChangeRequestEditor
      referenceData={{ generators } as any}
      onSave={onSave}
      onCancel={jest.fn()}
    />
  );
  return onSave;
}

// Combobox order once GENERATOR is selected (auto-selects the first generator
// target + INTERARRIVAL_TIMING property + scaleRate mode):
//   [0] Object Type, [1] Target Object, [2] Property, [3] Change mode.
// The first combobox is always "Object Type"; setting it to GENERATOR triggers
// the cascading reset effect (component treats an undefined changeRequest as new).
function selectObjectType(value: string) {
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value } });
}

describe("ChangeRequestEditor — inter-arrival timing", () => {
  it("saves a scaleRate duration modification", () => {
    const onSave = renderEditor([genExponential]);
    selectObjectType(ScenarioObjectType.GENERATOR);
    // scaleRate mode shows a single number input (the arrival rate multiplier).
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const cr = onSave.mock.calls[0][0];
    expect(cr.modificationDetails).toMatchObject({
      type: "duration",
      mode: "scaleRate",
      factor: 3,
    });
  });

  it("blocks a rate multiplier against a non-scalable (beta) distribution", () => {
    renderEditor([genBeta]);
    selectObjectType(ScenarioObjectType.GENERATOR);
    expect(screen.getByText(/cannot be rate-scaled/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /add|update/i }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it("pre-fills + saves a setDistribution modification", () => {
    const onSave = renderEditor([genExponential]);
    selectObjectType(ScenarioObjectType.GENERATOR);
    // Switch the "Change" mode select (4th combobox) to "Replace arrival distribution".
    fireEvent.change(screen.getAllByRole("combobox")[3], { target: { value: "setDistribution" } });
    fireEvent.click(screen.getByRole("button", { name: /add|update/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const md = onSave.mock.calls[0][0].modificationDetails;
    expect(md.mode).toBe("setDistribution");
    // Pre-fill: the saved duration reflects the generator's CURRENT distribution.
    expect(md.duration.distribution.distributionType).toBe("exponential");
  });

  it("preserves setDistribution mode when re-opening a saved change request", () => {
    const existingCR = {
      id: "cr1",
      objectType: ScenarioObjectType.GENERATOR,
      objectMatchCriteria: { name: "Arrivals" },
      modificationDetails: {
        type: "duration",
        propertyName: "INTERARRIVAL_TIMING",
        mode: "setDistribution",
        duration: {
          durationPeriodUnit: "MINUTES",
          distribution: { distributionType: "constant", parameters: { value: 1 }, description: "" },
        },
      },
    };
    render(
      <React.StrictMode>
        <ChangeRequestEditor
          changeRequest={existingCR as any}
          referenceData={{ generators: [genExponential] } as any}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      </React.StrictMode>
    );
    // The "Change" mode <select> is the combobox that offers the setDistribution
    // option (GENERATOR + INTERARRIVAL_TIMING is already active in edit mode).
    // With the bug it reverts to 'scaleRate'; the fix keeps it 'setDistribution'.
    const combos = screen.getAllByRole("combobox") as HTMLSelectElement[];
    const changeModeSelect = combos.find((c) =>
      Array.from(c.options).some((o) => o.value === "setDistribution")
    );
    expect(changeModeSelect).toBeDefined();
    expect(changeModeSelect!.value).toBe("setDistribution");
  });
});
