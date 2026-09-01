// Complexity Views, Lucid half (Task 11b review round 1, Important 2).
//
// Review found that Lucid had NO deliberate entry point to Settings at
// all -- only ViewTell's teaching path, which renders exclusively when a
// hidden surface is actually in use. A Basic-view Lucid user whose own
// model uses nothing hidden therefore had no reachable control to change
// their view (SettingsPanel.tsx's own header comment names the account-menu
// gear as the OTHER, deliberate, path -- Lucid has no account-menu gear, so
// this "..." panel menu is the next best home). This test pins that entry
// point the same way PanelHeader.removeModel.test.tsx pins "Remove Quodsi
// Model": present in the overflow menu, wired to the handler the host
// supplies.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PanelHeader } from "../PanelHeader";

// Heavy children that pull in messaging/auth context — irrelevant to this menu.
vi.mock("../StudiesLaunchButton", () => ({ StudiesLaunchButton: () => <div /> }));
vi.mock("../../SimulationComponentSelector", () => ({
  SimulationComponentSelector: () => <div />,
}));

const baseProps = {
  modelName: "Test Model",
  validationState: null,
  currentElement: null,
  editorType: "model",
  onElementTypeChange: vi.fn(),
};

const openMenu = () => fireEvent.click(screen.getByTitle("More options"));

describe("PanelHeader — Settings (the deliberate entry point)", () => {
  it("offers Settings in the overflow menu, alongside Status", () => {
    render(<PanelHeader {...baseProps} onOpenSettings={vi.fn()} />);
    openMenu();
    expect(screen.getByRole("button", { name: /^Settings$/i })).toBeInTheDocument();
  });

  it("calls onOpenSettings and closes the menu on click", () => {
    const onOpenSettings = vi.fn();
    render(<PanelHeader {...baseProps} onOpenSettings={onOpenSettings} />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: /^Settings$/i }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /^Settings$/i })).toBeNull();
  });

  it("renders even with no handler supplied -- the item itself is unconditional, matching Status", () => {
    render(<PanelHeader {...baseProps} />);
    openMenu();
    expect(screen.getByRole("button", { name: /^Settings$/i })).toBeInTheDocument();
  });
});
