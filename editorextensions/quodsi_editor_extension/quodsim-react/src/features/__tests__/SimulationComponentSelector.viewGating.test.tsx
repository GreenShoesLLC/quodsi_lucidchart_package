// SimulationComponentSelector.viewGating.test.tsx
//
// Daniel's ruling (2026-09-04, Lucid smoke): a dropped shape in Basic must
// not offer Resource -- Basic is delay-only, resources arrive in
// Intermediate. Same catalog surface (shape.type.resource) as the drawio /
// Studio ShapeTypeSelector. The selected type is grandfathered (disabled) so
// an existing Resource block never has its <select> fall to another value.
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { SimulationComponentSelector } from "../SimulationComponentSelector";
import { DiagramElementType, SimulationObjectType } from "@quodsi/lucid-shared";
import { setView } from "quodsi_studio/platforms/shared";

const labels = () => within(screen.getByRole("combobox")).getAllByRole("option").map((o) => o.textContent);

beforeEach(() => { localStorage.clear(); setView("basic"); });
afterEach(() => setView("basic"));

describe("SimulationComponentSelector — the type list follows the view", () => {
  it("Basic offers a block None, Activity and Generator only", () => {
    render(
      <SimulationComponentSelector
        selectedType={SimulationObjectType.None}
        elementId="b1"
        diagramElementType={DiagramElementType.BLOCK}
        onTypeChange={vi.fn()}
      />
    );
    expect(labels()).toEqual(["Activity", "Generator", "None"]);
  });

  it("Intermediate offers Resource again", () => {
    setView("intermediate");
    render(
      <SimulationComponentSelector
        selectedType={SimulationObjectType.None}
        elementId="b1"
        diagramElementType={DiagramElementType.BLOCK}
        onTypeChange={vi.fn()}
      />
    );
    expect(labels()).toEqual(["Activity", "Generator", "Resource", "None"]);
  });

  it("grandfathers an existing Resource block in Basic: selected and disabled", () => {
    render(
      <SimulationComponentSelector
        selectedType={SimulationObjectType.Resource}
        elementId="b1"
        diagramElementType={DiagramElementType.BLOCK}
        onTypeChange={vi.fn()}
      />
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe(SimulationObjectType.Resource);
    const opt = within(select).getByRole("option", { name: "Resource" }) as HTMLOptionElement;
    expect(opt.disabled).toBe(true);
  });

  it("lines are unaffected: None and Connector", () => {
    render(
      <SimulationComponentSelector
        selectedType={SimulationObjectType.None}
        elementId="l1"
        diagramElementType={DiagramElementType.LINE}
        onTypeChange={vi.fn()}
      />
    );
    expect(labels()).toEqual(["Connector", "None"]);
  });
});
