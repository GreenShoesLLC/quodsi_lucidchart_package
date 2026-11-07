// PanelHeader is a host TOOLBAR, not a second header (ClickUp 86e39r8e5).
// Every converted element and the model render a Studio shared editor
// directly beneath it, and that editor's EditorHeader already shows the
// icon, name, accent stripe and type. So PanelHeader carries only what
// EditorHeader has no home for: the shared launch bar in every view (What-if,
// the Advisor and, in developer mode, Developer Tools; user decision
// 2026-11-07) and, below it for an element, the type dropdown.
// The old "..." menu is gone: its items live in the extension's Quodsi menu.
// The unconverted view is the exception: ModelPanel mounts no editor beneath
// it, so it keeps its title and instruction.
import React from "react";
import { render, screen } from "@testing-library/react";
import { PanelHeader } from "../PanelHeader";

vi.mock("../useLucidStudiesLaunch", () => ({
  useLucidStudiesLaunch: () => ({ variant: "full", authStatus: "signed-in", blockerCount: 0, onOpen: () => {} }),
}));

const baseProps = {
  onElementTypeChange: vi.fn(),
};

const activity: any = { id: "a1", name: "Triage", metadata: { type: "Activity" }, data: { name: "Triage" } };
const unconverted: any = { id: "b1", name: "", isUnconverted: true, metadata: { type: "None" }, data: {} };

describe("PanelHeader — slim toolbar", () => {
  it("a converted element shows the launch bar and the type dropdown: no icon, name or context line", () => {
    const { container } = render(<PanelHeader {...baseProps} currentElement={activity} />);

    expect(screen.getByRole("button", { name: "What-if Analysis" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Element type" })).toBeInTheDocument();
    expect(screen.queryByTitle("More options")).toBeNull();
    expect(screen.queryByText("Triage")).toBeNull();
    expect(screen.queryByText(/in "Clinic"/)).toBeNull();
    expect(container.querySelector("svg.lucide-wrench")).toBeNull();
  });

  it("the model view shows only the launch bar: no name, icon, stats or type dropdown", () => {
    const { container } = render(<PanelHeader {...baseProps} currentElement={null} />);

    expect(screen.getByRole("button", { name: "What-if Analysis" })).toBeInTheDocument();
    expect(screen.queryByTitle("More options")).toBeNull();
    expect(screen.queryByText("Clinic")).toBeNull();
    expect(screen.queryByText(/Activities/)).toBeNull();
    expect(container.querySelector("svg.lucide-network")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("an unconverted element keeps its title and instruction: nothing else names it", () => {
    render(<PanelHeader {...baseProps} currentElement={unconverted} />);

    expect(screen.getByRole("button", { name: "What-if Analysis" })).toBeInTheDocument();
    expect(screen.getByText("Unconverted Element")).toBeInTheDocument();
    expect(screen.getByText("Select element type to begin:")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Element type" })).toBeInTheDocument();
    expect(screen.queryByTitle("More options")).toBeNull();
  });

  it("shows the Developer Tools button only in developer mode", () => {
    const { unmount } = render(<PanelHeader {...baseProps} currentElement={null} />);
    expect(screen.queryByRole("button", { name: "Developer Tools" })).toBeNull();
    unmount();

    localStorage.setItem("quodsi_devmode", "true");
    render(<PanelHeader {...baseProps} currentElement={null} />);
    expect(screen.getByRole("button", { name: "Developer Tools" })).toBeInTheDocument();
  });

  it("shows Developer Tools once in every view", () => {
    localStorage.setItem("quodsi_devmode", "true");
    for (const element of [null, activity, unconverted]) {
      const { unmount } = render(<PanelHeader {...baseProps} currentElement={element} />);
      expect(screen.getAllByRole("button", { name: "Developer Tools" })).toHaveLength(1);
      unmount();
    }
  });

  it("a swimlane shows the launch bar only: it draws its own header", () => {
    const lane: any = { id: "s1", name: "Lanes", metadata: { type: "None" }, data: { className: "AdvancedSwimLaneBlock" } };
    render(<PanelHeader {...baseProps} currentElement={lane} isSwimLane />);
    expect(screen.getByRole("button", { name: "What-if Analysis" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByText("Unconverted Element")).toBeNull();
  });
});

afterEach(() => localStorage.removeItem("quodsi_devmode"));
