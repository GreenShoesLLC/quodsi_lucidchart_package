// The header's launch bar is the panel's ONE Advisor button (user decision
// 2026-11-07): the shared editor headers no longer draw one. It follows the
// selection: a converted element opens that element's consult, anything else
// (the model, an unconverted shape, a swimlane) opens the project.
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { HostAdvisorProvider } from "quodsi_studio/platforms/shared";
import { PanelHeader, lucidAdvisorFocus } from "../PanelHeader";

vi.mock("../useLucidStudiesLaunch", () => ({
  useLucidStudiesLaunch: () => ({ variant: "full", authStatus: "signed-in", blockerCount: 0, onOpen: () => {} }),
}));

const activity: any = { id: "a1", name: "", metadata: { type: "Activity" }, data: { name: "Triage" } };
const resource: any = { id: "blk1", name: "Nurse block", metadata: { type: "Resource" }, data: { resourceId: "res-nurse" } };
const unlinked: any = { id: "blk2", name: "", metadata: { type: "Resource" }, data: {} };
const unconverted: any = { id: "b1", name: "", isUnconverted: true, metadata: { type: "None" }, data: {} };
const model: any = { id: "m", name: "Clinic", metadata: { type: "Model" }, data: {} };

function renderHeader(currentElement: any, extra: Record<string, unknown> = {}) {
  const api = { openAdvisor: vi.fn(), openProject: vi.fn() };
  const { unmount } = render(
    <HostAdvisorProvider onOpenAdvisor={api.openAdvisor} onOpenProject={api.openProject}>
      <PanelHeader currentElement={currentElement} onElementTypeChange={vi.fn()} {...extra} />
    </HostAdvisorProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open the Advisor" }));
  return { ...api, unmount };
}

afterEach(() => localStorage.clear());

describe("PanelHeader — the one Advisor button", () => {
  it("is the only Advisor button, in every view, developer mode on or off", () => {
    localStorage.setItem("quodsi_devmode", "true");
    for (const element of [null, activity, unconverted]) {
      const { unmount } = render(
        <HostAdvisorProvider onOpenAdvisor={vi.fn()} onOpenProject={vi.fn()}>
          <PanelHeader currentElement={element} onElementTypeChange={vi.fn()} />
        </HostAdvisorProvider>,
      );
      expect(screen.getAllByRole("button", { name: /advisor/i })).toHaveLength(1);
      unmount();
    }
  });

  it("a converted element opens that element's consult", () => {
    const api = renderHeader(activity);
    expect(api.openAdvisor).toHaveBeenCalledWith({ id: "a1", type: "Activity", name: "Triage", mode: "definition" });
    expect(api.openProject).not.toHaveBeenCalled();
  });

  it("nothing selected, the model, an unconverted shape or a swimlane opens the project", () => {
    for (const [element, extra] of [[null, {}], [model, {}], [unconverted, {}], [activity, { isSwimLane: true }]] as const) {
      const api = renderHeader(element, extra);
      expect(api.openProject).toHaveBeenCalled();
      expect(api.openAdvisor).not.toHaveBeenCalled();
      api.unmount();
    }
  });
});

describe("lucidAdvisorFocus", () => {
  it("a Resource block focuses the resource it points at, not the block", () => {
    expect(lucidAdvisorFocus(resource)).toEqual({ id: "res-nurse", type: "Resource", mode: "definition" });
  });

  it("an unlinked Resource block gives no focus", () => {
    expect(lucidAdvisorFocus(unlinked)).toBeUndefined();
  });

  it("prefers the element's name, then its data name", () => {
    expect(lucidAdvisorFocus({ ...activity, name: "Intake" })?.name).toBe("Intake");
    expect(lucidAdvisorFocus(activity)?.name).toBe("Triage");
  });
});
