// PanelHeader is a host TOOLBAR, not a second header (ClickUp 86e39r8e5).
// Every converted element and the model render a Studio shared editor
// directly beneath it, and that editor's EditorHeader already shows the
// icon, name, accent stripe and type. So for those views PanelHeader carries
// only what EditorHeader has no home for: the "..." menu, the Studies
// launcher (model) and the type dropdown (element). The unconverted view is
// the exception: ModelPanel mounts no editor beneath it, so it keeps its
// title and instruction.
import React from "react";
import { render, screen } from "@testing-library/react";
import { PanelHeader } from "../PanelHeader";

vi.mock("../StudiesLaunchButton", () => ({
  StudiesLaunchButton: () => <button type="button">Studies</button>,
}));

const baseProps = {
  onElementTypeChange: vi.fn(),
};

const activity: any = { id: "a1", name: "Triage", metadata: { type: "Activity" }, data: { name: "Triage" } };
const unconverted: any = { id: "b1", name: "", isUnconverted: true, metadata: { type: "None" }, data: {} };

describe("PanelHeader — slim toolbar", () => {
  it("a converted element shows only the type dropdown and the menu: no icon, name or context line", () => {
    const { container } = render(<PanelHeader {...baseProps} currentElement={activity} />);

    expect(screen.getByRole("combobox", { name: "Element type" })).toBeInTheDocument();
    expect(screen.getByTitle("More options")).toBeInTheDocument();
    expect(screen.queryByText("Triage")).toBeNull();
    expect(screen.queryByText(/in "Clinic"/)).toBeNull();
    expect(container.querySelector("svg.lucide-wrench")).toBeNull();
  });

  it("the model view shows only the Studies launcher and the menu: no name, icon or stats", () => {
    const { container } = render(<PanelHeader {...baseProps} currentElement={null} />);

    expect(screen.getByRole("button", { name: "Studies" })).toBeInTheDocument();
    expect(screen.getByTitle("More options")).toBeInTheDocument();
    expect(screen.queryByText("Clinic")).toBeNull();
    expect(screen.queryByText(/Activities/)).toBeNull();
    expect(container.querySelector("svg.lucide-network")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("an unconverted element keeps its title and instruction: nothing else names it", () => {
    render(<PanelHeader {...baseProps} currentElement={unconverted} />);

    expect(screen.getByText("Unconverted Element")).toBeInTheDocument();
    expect(screen.getByText("Select element type to begin:")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Element type" })).toBeInTheDocument();
    expect(screen.getByTitle("More options")).toBeInTheDocument();
  });
});
