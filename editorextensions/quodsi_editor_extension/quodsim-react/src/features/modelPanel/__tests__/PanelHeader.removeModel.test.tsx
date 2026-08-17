// Restores the "unconvert" entry point lost when the local conversion-preview UI
// was replaced by the embedded Studio mapping panel (ClickUp 86e2a5ff7).
//
// `onRemoveModel` had been threaded into PanelHeader but never rendered — a dead
// prop since the Nov 2025 header redesign. These tests pin that it is reachable
// again, and that it is reachable ONLY through the confirmation.

// @quodsi/lucid-shared transitively requires axios (ESM entry CRA's Jest can't parse).
vi.mock("axios", () => ({}));

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

describe("PanelHeader — Remove Quodsi Model", () => {
  it("offers the action in the overflow menu", () => {
    render(<PanelHeader {...baseProps} onRemoveModel={vi.fn()} />);
    openMenu();
    expect(
      screen.getByRole("button", { name: /Remove Quodsi Model/i })
    ).toBeInTheDocument();
  });

  it("omits it when the host supplies no handler", () => {
    render(<PanelHeader {...baseProps} />);
    openMenu();
    expect(screen.queryByRole("button", { name: /Remove Quodsi Model/i })).toBeNull();
  });

  it("does NOT remove on the menu click alone — it asks first", () => {
    const onRemoveModel = vi.fn();
    render(<PanelHeader {...baseProps} onRemoveModel={onRemoveModel} />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: /Remove Quodsi Model/i }));

    expect(onRemoveModel).not.toHaveBeenCalled();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("removes once the confirmation is accepted", () => {
    const onRemoveModel = vi.fn();
    render(<PanelHeader {...baseProps} onRemoveModel={onRemoveModel} />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: /Remove Quodsi Model/i }));
    // The dialog's confirm button is the exact-labelled one.
    fireEvent.click(screen.getByRole("button", { name: "Remove Model" }));

    expect(onRemoveModel).toHaveBeenCalledTimes(1);
  });

  it("cancelling leaves the model alone", () => {
    const onRemoveModel = vi.fn();
    render(<PanelHeader {...baseProps} onRemoveModel={onRemoveModel} />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: /Remove Quodsi Model/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRemoveModel).not.toHaveBeenCalled();
    expect(screen.queryByText(/cannot be undone/i)).toBeNull();
  });
});
