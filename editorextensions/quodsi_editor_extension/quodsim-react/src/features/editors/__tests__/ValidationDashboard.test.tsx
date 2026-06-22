// ValidationDashboard.test.tsx
// Verifies: "Go to source" appears for issues with an elementId; INFO issues
// and stat cards (Errors/Warnings/Info count cards) are absent.

jest.mock("../../../messaging/senders", () => ({
  useModelOpsSender: () => ({
    locateElement: mockLocateElement,
  }),
}));

const mockLocateElement = jest.fn();
const mockOnGoToModelSettings = jest.fn();

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ValidationDashboard } from "../ValidationDashboard";
import { ValidationSeverity } from "@quodsi/lucid-shared";
import type { ValidationResult } from "@quodsi/lucid-shared";

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    isValid: false,
    issues: [],
    summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
    ...overrides,
  } as ValidationResult;
}

beforeEach(() => {
  mockLocateElement.mockClear();
  mockOnGoToModelSettings.mockClear();
});

describe("ValidationDashboard", () => {
  it("shows placeholder when validationState is null", () => {
    render(<ValidationDashboard validationState={null} />);
    expect(screen.getByText(/No validation results available/i)).toBeInTheDocument();
  });

  it("shows valid message when there are no errors or warnings", () => {
    render(<ValidationDashboard validationState={makeResult({ isValid: true })} />);
    expect(screen.getByText(/Model is valid/i)).toBeInTheDocument();
  });

  it("renders 'Go to source' button for an error issue that has an elementId", () => {
    const result = makeResult({
      issues: [
        {
          id: "issue-1",
          severity: ValidationSeverity.ERROR,
          message: "Activity has no connectors",
          elementId: "elem-abc",
          code: "E001",
        },
      ],
      summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
    });
    render(<ValidationDashboard validationState={result} />);

    expect(screen.getByText("Activity has no connectors")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Go to source/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(mockLocateElement).toHaveBeenCalledWith("elem-abc");
  });

  it("does NOT render 'Go to source' for an issue without elementId and not model-level", () => {
    const result = makeResult({
      issues: [
        {
          id: "issue-2",
          severity: ValidationSeverity.WARNING,
          message: "No generators defined",
          code: "W001",
        },
      ],
      summary: { errorCount: 0, warningCount: 1, infoCount: 0 },
    });
    render(<ValidationDashboard validationState={result} />);

    expect(screen.getByText("No generators defined")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Go to source/i })).toBeNull();
  });

  it("does NOT render INFO-severity issues", () => {
    const result = makeResult({
      issues: [
        {
          id: "issue-3",
          severity: ValidationSeverity.INFO,
          message: "Model has 3 activities",
          code: "I001",
        },
        {
          id: "issue-4",
          severity: ValidationSeverity.WARNING,
          message: "Low throughput warning",
          code: "W001",
        },
      ],
      summary: { errorCount: 0, warningCount: 1, infoCount: 1 },
    });
    render(<ValidationDashboard validationState={result} />);

    expect(screen.queryByText("Model has 3 activities")).toBeNull();
    expect(screen.getByText("Low throughput warning")).toBeInTheDocument();
  });

  it("does NOT render Errors/Warnings/Info count stat cards", () => {
    const result = makeResult({
      issues: [
        {
          id: "issue-5",
          severity: ValidationSeverity.ERROR,
          message: "Missing connector",
          elementId: "e1",
          code: "E001",
        },
      ],
      summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
    });
    render(<ValidationDashboard validationState={result} />);

    // The old stat cards used the literal text "Errors", "Warnings", "Info"
    // as card labels (separate from section headings). After the rewrite the
    // section heading reads "Errors (1)", so plain "Errors" alone must not
    // appear as a standalone text node.
    const infoCards = screen.queryAllByText("Info");
    expect(infoCards).toHaveLength(0);

    // Big green "Model is Valid" card must be absent when there ARE issues
    expect(screen.queryByText(/Model is Valid/i)).toBeNull();
  });

  // ── Model-level issue routing ─────────────────────────────────────────────

  it("model-level issue: 'Go to source' calls onGoToModelSettings, not locateElement", () => {
    const result = makeResult({
      issues: [
        {
          id: "issue-ml-1",
          severity: ValidationSeverity.ERROR,
          message: "Run clock period must be greater than zero",
          code: "invalid_run_clock_period",
          // no elementId — model-level issues have none
        },
      ],
      summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
    });
    render(
      <ValidationDashboard
        validationState={result}
        onGoToModelSettings={mockOnGoToModelSettings}
      />
    );

    const btn = screen.getByRole("button", { name: /Go to source/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(mockOnGoToModelSettings).toHaveBeenCalledTimes(1);
    expect(mockLocateElement).not.toHaveBeenCalled();
  });

  it("shape-level issue: 'Go to source' calls locateElement, not onGoToModelSettings", () => {
    const result = makeResult({
      issues: [
        {
          id: "issue-shape-1",
          severity: ValidationSeverity.ERROR,
          message: "Activity has no outgoing connectors",
          elementId: "shape-xyz",
          code: "activity_no_connectors",
        },
      ],
      summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
    });
    render(
      <ValidationDashboard
        validationState={result}
        onGoToModelSettings={mockOnGoToModelSettings}
      />
    );

    const btn = screen.getByRole("button", { name: /Go to source/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(mockLocateElement).toHaveBeenCalledWith("shape-xyz");
    expect(mockOnGoToModelSettings).not.toHaveBeenCalled();
  });
});