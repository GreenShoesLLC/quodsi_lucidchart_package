// The header's type dropdown is the SHARED ShapeTypeSelect (spec 2026-09-15
// resource claims): its option rules live once, alongside drawio's and
// Visio's. A change still reports (elementId, type) so ModelPanel sends
// ELEMENT_CONVERT.
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DiagramElementType, SimulationObjectType } from "@quodsi/lucid-shared";
import { setView } from "quodsi_studio/platforms/shared";
import { PanelHeader } from "../PanelHeader";

vi.mock("../StudiesLaunchButton", () => ({ StudiesLaunchButton: () => <div /> }));

const typeSelect = () => screen.getByRole("combobox", { name: "Element type" }) as HTMLSelectElement;
const values = () =>
  within(typeSelect())
    .getAllByRole("option")
    .map((o) => (o as HTMLOptionElement).value);

const baseProps = { modelName: "Clinic" };

beforeEach(() => {
  localStorage.clear();
  setView("basic");
});
afterEach(() => setView("basic"));

describe("PanelHeader — shared type dropdown", () => {
  it("a converted block shows its type and reports a change with the element id", () => {
    setView("intermediate");
    const onElementTypeChange = vi.fn();
    const activity: any = { id: "a1", name: "Triage", metadata: { type: "Activity" }, data: { name: "Triage" } };
    render(
      <PanelHeader
        {...baseProps}
        editorType="Activity"
        currentElement={activity}
        diagramElementType={DiagramElementType.BLOCK}
        onElementTypeChange={onElementTypeChange}
      />,
    );

    expect(typeSelect().value).toBe("Activity");
    expect(values()).toEqual(["None", "Activity", "Resource", "Generator"]);
    fireEvent.change(typeSelect(), { target: { value: "Generator" } });
    expect(onElementTypeChange).toHaveBeenCalledWith("a1", SimulationObjectType.Generator);
  });

  it("a line offers None and Connector", () => {
    const connector: any = { id: "c1", name: "Flow", metadata: { type: "Connector" }, data: { name: "Flow" } };
    render(
      <PanelHeader
        {...baseProps}
        editorType="Connector"
        currentElement={connector}
        diagramElementType={DiagramElementType.LINE}
        onElementTypeChange={vi.fn()}
      />,
    );

    expect(typeSelect().value).toBe("Connector");
    expect(values()).toEqual(["None", "Connector"]);
  });

  it("an unconverted block starts at None, withholds Resource in Basic, and reports a pick", () => {
    const onElementTypeChange = vi.fn();
    const unconverted: any = { id: "b1", name: "", isUnconverted: true, metadata: { type: "None" }, data: {} };
    render(
      <PanelHeader
        {...baseProps}
        editorType="None"
        currentElement={unconverted}
        diagramElementType={DiagramElementType.BLOCK}
        onElementTypeChange={onElementTypeChange}
      />,
    );

    expect(typeSelect().value).toBe("None");
    expect(values()).toEqual(["None", "Activity", "Generator"]);
    fireEvent.change(typeSelect(), { target: { value: "Activity" } });
    expect(onElementTypeChange).toHaveBeenCalledWith("b1", SimulationObjectType.Activity);
  });

  it("a Resource block in Basic keeps Resource selected and disabled", () => {
    const resource: any = { id: "r1", name: "Nurse", metadata: { type: "Resource" }, data: { name: "Nurse" } };
    render(
      <PanelHeader
        {...baseProps}
        editorType="Resource"
        currentElement={resource}
        diagramElementType={DiagramElementType.BLOCK}
        onElementTypeChange={vi.fn()}
      />,
    );

    expect(typeSelect().value).toBe("Resource");
    expect((within(typeSelect()).getByRole("option", { name: "Resource" }) as HTMLOptionElement).disabled).toBe(true);
  });
});
