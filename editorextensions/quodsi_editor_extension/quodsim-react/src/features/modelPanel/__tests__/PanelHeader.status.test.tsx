// Status now opens Studio's /status in a browser tab, which needs the Studio
// origin. ModelPanel supplies onOpenStatus only when it has one; the menu
// item is shown only when a handler is supplied.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PanelHeader } from "../PanelHeader";

vi.mock("../StudiesLaunchButton", () => ({ StudiesLaunchButton: () => <div /> }));

const baseProps = {
  modelName: "Test Model",
  currentElement: null,
  editorType: "model",
  onElementTypeChange: vi.fn(),
};

const openMenu = () => fireEvent.click(screen.getByTitle("More options"));

describe("PanelHeader — Status", () => {
  it("offers Status and calls the handler, closing the menu", () => {
    const onOpenStatus = vi.fn();
    render(<PanelHeader {...baseProps} onOpenStatus={onOpenStatus} />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: /^Status$/i }));
    expect(onOpenStatus).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /^Status$/i })).toBeNull();
  });

  it("hides Status when no handler is supplied (no Studio URL)", () => {
    render(<PanelHeader {...baseProps} onOpenSettings={vi.fn()} />);
    openMenu();
    expect(screen.queryByRole("button", { name: /^Status$/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^Settings$/i })).toBeInTheDocument();
  });
});
