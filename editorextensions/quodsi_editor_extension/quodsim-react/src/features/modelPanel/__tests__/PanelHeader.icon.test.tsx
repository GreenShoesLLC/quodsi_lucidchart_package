// PanelHeader's element icon comes from the shared Studio typeConfig
// (TYPE_ICON), with the warning icon for a type that is not a header type.
import React from "react";
import { render } from "@testing-library/react";
import { PanelHeader } from "../PanelHeader";

vi.mock("../StudiesLaunchButton", () => ({ StudiesLaunchButton: () => <div /> }));
const baseProps = {
  modelName: "Clinic",
  onElementTypeChange: vi.fn(),
};

const elementOfType = (type: string): any => ({
  id: "e1",
  name: "E1",
  metadata: { type },
  data: { name: "E1" },
});

describe("PanelHeader — element icon", () => {
  it("shows the shared Activity icon (Wrench) for an activity", () => {
    const { container } = render(
      <PanelHeader {...baseProps} editorType="Activity" currentElement={elementOfType("Activity")} />,
    );
    expect(container.querySelector("svg.lucide-wrench")).not.toBeNull();
  });

  it("shows the warning icon for an element whose type is not a header type", () => {
    const { container } = render(
      <PanelHeader {...baseProps} editorType="None" currentElement={elementOfType("None")} />,
    );
    expect(container.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
  });
});
