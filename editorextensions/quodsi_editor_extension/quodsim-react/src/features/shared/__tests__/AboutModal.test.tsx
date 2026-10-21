import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MODEL_SCHEMA_VERSION } from "@quodsi/lucid-shared";
import { QUODSI_VERSION_TEXT, isDevMode } from "quodsi_studio/platforms/shared";
import { AboutModal } from "../AboutModal";

describe("AboutModal", () => {
  beforeEach(() => localStorage.clear());

  // Spec 2026-10-21 quodsi-version: the About box names the Quodsi release this
  // package was built as, and calls the model schema by its name (it read "App").
  it("shows the Quodsi version and labels the model schema", () => {
    render(<AboutModal isOpen onClose={() => {}} />);
    expect(screen.getByTestId("about-quodsi-version")).toHaveTextContent(`Quodsi ${QUODSI_VERSION_TEXT}`);
    expect(screen.getByText(`Model schema: ${MODEL_SCHEMA_VERSION}`)).toBeInTheDocument();
    expect(screen.queryByText(/App:/)).toBeNull();
  });
});

describe("AboutModal — developer mode", () => {
  beforeEach(() => localStorage.clear());

  it("turns the shared developer flag on after five clicks on the version", () => {
    render(<AboutModal isOpen onClose={() => {}} />);
    const version = screen.getByTestId("about-quodsi-version");
    for (let i = 0; i < 4; i++) fireEvent.click(version);
    expect(isDevMode()).toBe(false);
    fireEvent.click(version);
    expect(isDevMode()).toBe(true);
    expect(screen.getByText("Developer mode enabled")).toBeInTheDocument();
    expect(localStorage.getItem("quodsi_devtools")).toBeNull();
  });
});
