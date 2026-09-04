// The Lucid Advisor entry point. Mirrors GeneratorEditor.settingsModal.test.tsx:
// only the terminal sendMessage is a spy, so the click exercises the REAL
// useSimulationRunSender -> useSender -> useMessaging().sendMessage chain
// building the OPEN_ADVISOR_MODAL payload.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnvelopeMessageType, DEFAULT_MODAL_SIZE } from "@quodsi/lucid-shared";

const { mockSendMessage } = vi.hoisted(() => ({ mockSendMessage: vi.fn() }));
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

let mockAuthState: any = { isAuthenticated: true };
vi.mock("../../../messaging/MessageContext", () => ({
  useAuth: () => mockAuthState,
}));

import { AdvisorLaunchButton, advisorFocusForElement, modelAdvisorFocus } from "../AdvisorLaunchButton";

const ACTIVITY_FOCUS = { focusId: "a1", focusType: "Activity" as const, focusName: "Triage", mode: "definition" as const };

describe("AdvisorLaunchButton", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSendMessage.mockClear();
    mockAuthState = { isAuthenticated: true };
  });

  it("is disabled with a sign-in title when signed out, and sends nothing", () => {
    mockAuthState = { isAuthenticated: false };
    render(<AdvisorLaunchButton focus={ACTIVITY_FOCUS} />);
    const btn = screen.getByTestId("open-advisor-modal");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("title", "Sign in to use the Advisor");
    fireEvent.click(btn);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("sends OPEN_ADVISOR_MODAL with the focus and the modal size preference", () => {
    render(<AdvisorLaunchButton focus={ACTIVITY_FOCUS} />);
    const btn = screen.getByRole("button", { name: "Ask the Advisor about this" });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(mockSendMessage).toHaveBeenCalledWith(EnvelopeMessageType.OPEN_ADVISOR_MODAL, {
      focusId: "a1",
      focusType: "Activity",
      focusName: "Triage",
      mode: "definition",
      modalSize: DEFAULT_MODAL_SIZE,
    });
  });
});

describe("advisorFocusForElement", () => {
  it("maps a consultable element type to an element focus", () => {
    expect(advisorFocusForElement("Generator", "g1", "Arrivals", "Clinic")).toEqual({
      focusId: "g1", focusType: "Generator", focusName: "Arrivals", mode: "definition",
    });
  });

  it("maps a non-consultable type (None, unknown) to the model focus, carrying the model name", () => {
    expect(advisorFocusForElement("None", "x", "Thing", "Clinic")).toEqual({
      focusId: "", focusType: "Model", focusName: "Clinic", mode: "definition",
    });
    expect(advisorFocusForElement("None", "x", "Thing", "")).toEqual({
      focusId: "", focusType: "Model", focusName: undefined, mode: "definition",
    });
  });
});

describe("modelAdvisorFocus", () => {
  it("carries the model name, or undefined when blank", () => {
    expect(modelAdvisorFocus("Clinic")).toEqual({ focusId: "", focusType: "Model", focusName: "Clinic", mode: "definition" });
    expect(modelAdvisorFocus("")).toEqual({ focusId: "", focusType: "Model", focusName: undefined, mode: "definition" });
  });
});
