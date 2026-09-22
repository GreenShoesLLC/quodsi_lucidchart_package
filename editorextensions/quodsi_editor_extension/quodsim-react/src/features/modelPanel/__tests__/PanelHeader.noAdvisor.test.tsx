// The Advisor's button lives in each shared editor header now: ModelPanel
// supplies the context (spec 2026-09-15 §2). PanelHeader draws none of its
// own, even with developer mode on.
import React from "react";
import { render, screen } from "@testing-library/react";
import { PanelHeader } from "../PanelHeader";

vi.mock("../StudiesLaunchButton", () => ({ StudiesLaunchButton: () => <div /> }));

const baseProps = {
  onElementTypeChange: vi.fn(),
};

describe("PanelHeader — no Advisor button of its own", () => {
  beforeEach(() => localStorage.setItem("quodsi_devmode", "true"));
  afterEach(() => localStorage.clear());

  it("model header", () => {
    render(<PanelHeader {...baseProps} currentElement={null} />);
    expect(screen.queryByRole("button", { name: /advisor/i })).toBeNull();
  });

  it("element header", () => {
    const activity: any = { id: "a1", name: "Triage", metadata: { type: "Activity" }, data: { name: "Triage" } };
    render(<PanelHeader {...baseProps} currentElement={activity} />);
    expect(screen.queryByRole("button", { name: /advisor/i })).toBeNull();
  });
});
