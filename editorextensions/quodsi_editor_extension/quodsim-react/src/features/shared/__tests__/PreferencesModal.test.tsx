// @quodsi/lucid-shared transitively requires axios (ESM entry CRA's Jest can't parse).
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreferencesModal } from "../PreferencesModal";

describe("PreferencesModal", () => {
  beforeEach(() => localStorage.clear());

  it("renders nothing when closed", () => {
    const { container } = render(<PreferencesModal isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists all size options and reflects the stored value", () => {
    localStorage.setItem("quodsi_modal_size", "large");
    render(<PreferencesModal isOpen={true} onClose={jest.fn()} />);
    const select = screen.getByLabelText("Simulation window size") as HTMLSelectElement;
    expect(select.value).toBe("large");
    // medium / large / xlarge / fullscreen
    expect(select.querySelectorAll("option")).toHaveLength(4);
  });

  it("persists the chosen size to localStorage", () => {
    render(<PreferencesModal isOpen={true} onClose={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("Simulation window size"), {
      target: { value: "fullscreen" },
    });
    expect(localStorage.getItem("quodsi_modal_size")).toBe("fullscreen");
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = jest.fn();
    render(<PreferencesModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTitle("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
