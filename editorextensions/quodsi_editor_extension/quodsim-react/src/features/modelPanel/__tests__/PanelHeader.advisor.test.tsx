// The Advisor sparkle ships DARK in Lucid: PanelHeader mounts AdvisorLaunchButton
// only when the `quodsi_devtools` localStorage flag is on (the same flag its
// DevTools menu item reads), in both the model header and the element header,
// with the focus derived from the selection. Mirrors PanelHeader.settings.test.tsx.
import React from "react";
import { render, screen } from "@testing-library/react";
import { PanelHeader } from "../PanelHeader";

vi.mock("../StudiesLaunchButton", () => ({ StudiesLaunchButton: () => <div /> }));
vi.mock("../../SimulationComponentSelector", () => ({
  SimulationComponentSelector: () => <div />,
}));
vi.mock("../AdvisorLaunchButton", async () => {
  const actual = await vi.importActual<typeof import("../AdvisorLaunchButton")>("../AdvisorLaunchButton");
  return {
    ...actual,
    AdvisorLaunchButton: ({ focus }: { focus: unknown }) => (
      <div data-testid="open-advisor-modal" data-focus={JSON.stringify(focus)} />
    ),
  };
});

const baseProps = {
  modelName: "Clinic",
  validationState: null,
  editorType: "model",
  onElementTypeChange: vi.fn(),
};

const activityElement: any = {
  id: "a1",
  name: "Triage",
  metadata: { type: "Activity" },
  data: { name: "Triage" },
};

const focusOf = () => JSON.parse(screen.getByTestId("open-advisor-modal").getAttribute("data-focus")!);

describe("PanelHeader — Advisor sparkle (dark behind quodsi_devtools)", () => {
  beforeEach(() => localStorage.clear());

  it("renders no sparkle when the devtools flag is off (model header)", () => {
    render(<PanelHeader {...baseProps} currentElement={null} />);
    expect(screen.queryByTestId("open-advisor-modal")).toBeNull();
  });

  it("renders no sparkle when the devtools flag is off (element header)", () => {
    render(<PanelHeader {...baseProps} editorType="activity" currentElement={activityElement} />);
    expect(screen.queryByTestId("open-advisor-modal")).toBeNull();
  });

  it("renders the sparkle with a Model focus when nothing is selected and the flag is on", () => {
    localStorage.setItem("quodsi_devtools", "true");
    render(<PanelHeader {...baseProps} currentElement={null} />);
    expect(focusOf()).toEqual({ focusId: "", focusType: "Model", focusName: "Clinic", mode: "definition" });
  });

  it("renders the sparkle with the element focus for a selected activity when the flag is on", () => {
    localStorage.setItem("quodsi_devtools", "true");
    render(<PanelHeader {...baseProps} editorType="activity" currentElement={activityElement} />);
    expect(focusOf()).toEqual({ focusId: "a1", focusType: "Activity", focusName: "Triage", mode: "definition" });
  });

  it("falls back to the Model focus, carrying the model name, for a non-consultable element type", () => {
    localStorage.setItem("quodsi_devtools", "true");
    const noneElement: any = {
      id: "x1",
      name: "Thing",
      metadata: { type: "None" },
      data: { name: "Thing" },
    };
    render(<PanelHeader {...baseProps} editorType="activity" currentElement={noneElement} />);
    expect(focusOf()).toEqual({ focusId: "", focusType: "Model", focusName: "Clinic", mode: "definition" });
  });
});
