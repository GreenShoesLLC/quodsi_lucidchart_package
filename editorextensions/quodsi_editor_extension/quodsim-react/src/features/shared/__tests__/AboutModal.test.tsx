import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { isDevMode } from "quodsi_studio/platforms/shared";
import { AboutModal } from "../AboutModal";

describe("AboutModal — developer mode", () => {
  beforeEach(() => localStorage.clear());

  it("turns the shared developer flag on after five clicks on the version", () => {
    render(<AboutModal isOpen onClose={() => {}} />);
    const version = screen.getByText(/^App:/);
    for (let i = 0; i < 4; i++) fireEvent.click(version);
    expect(isDevMode()).toBe(false);
    fireEvent.click(version);
    expect(isDevMode()).toBe(true);
    expect(screen.getByText("Developer mode enabled")).toBeInTheDocument();
    expect(localStorage.getItem("quodsi_devtools")).toBeNull();
  });
});
