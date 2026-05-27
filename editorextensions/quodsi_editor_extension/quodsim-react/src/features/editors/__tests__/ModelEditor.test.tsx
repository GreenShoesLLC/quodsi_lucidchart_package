// editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/ModelEditor.test.tsx
//
// Unit tests for the Sync button behavior in ScenariosAndRunsPanel
// (the inner component of ModelEditor that owns the handleSync callback).
//
// We test ScenariosAndRunsPanel directly rather than the outer ModelEditor:
//   1. ScenariosAndRunsPanel is where handleSync, the Sync button JSX, and the
//      useSync/useSyncSender bindings live — testing it in isolation keeps the
//      test focused on Sync behavior, not on rendering the full 5-tab editor.
//   2. The outer ModelEditor needs heavy prop scaffolding (Model, StateListManager,
//      EditorReferenceData, ValidationResult, save/validate callbacks, etc.) and
//      a populated MessagingProvider — none of which is needed for Sync coverage.
//
// All upstream hooks are mocked at the module level so we can observe dispatches
// and sender calls without standing up real Redux state or postMessage plumbing.
// NOTE on axios mock (must come BEFORE importing ModelEditor):
// @quodsi/shared (transitively pulled in by ModelEditor.tsx) eventually loads
// shared/dist/services/lucidApi.js, which requires axios. The axios package
// ships an ESM entry that CRA's Jest transformer can't parse out of the box.
// We don't exercise lucidApi in these tests — stubbing axios with an empty
// module satisfies the require() without dragging the ESM file through Babel.
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RunState } from "@quodsi/shared";
import { ScenariosAndRunsPanel } from "../ModelEditor";

// --- mock hook surfaces used by ScenariosAndRunsPanel ---------------------
// Each describe-block (re)wires these via .mockReturnValue, so we capture the
// jest.fn() instances in module-scoped variables we can assert on.
const mockDispatch = jest.fn();
const mockSyncAll = jest.fn();
const mockListScenarios = jest.fn();
const mockListSimulationRuns = jest.fn();
const mockDeleteSimulationRun = jest.fn();
const mockCancelSimulationRun = jest.fn();
const mockOpenResultsModal = jest.fn();

// Default sync state — overridden per-test for the disabled scenarios.
let mockSyncState = { isSyncing: false, lastSyncedAt: null, lastError: null };

jest.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({
    selection: { documentContext: { documentId: "doc-1", pageId: "page-1" } },
  }),
  useMessagingDispatch: () => mockDispatch,
  useSimulationRuns: () => ({ runs: [], loading: false, error: null }),
  useEntitlements: () => ({ loaded: true, scenariosPerModel: null, plan: "free" }),
}));

jest.mock("../../../messaging/MessageContext", () => ({
  // useSync is read at every render; the closure reads mockSyncState fresh.
  useSync: () => mockSyncState,
}));

jest.mock("../../../messaging/senders/syncSender", () => ({
  useSyncSender: () => ({ syncAll: mockSyncAll }),
}));

jest.mock("../../../messaging/senders/scenariosSender", () => ({
  useScenariosSender: () => ({ listScenarios: mockListScenarios }),
}));

jest.mock("../../../messaging/senders/simulationRunSender", () => ({
  useSimulationRunSender: () => ({
    listSimulationRuns: mockListSimulationRuns,
    deleteSimulationRun: mockDeleteSimulationRun,
    cancelSimulationRun: mockCancelSimulationRun,
    openResultsModal: mockOpenResultsModal,
  }),
}));

// Overridable run list — defaults to [] but can be set per-test.
let mockRuns: any[] = [];
jest.mock("../../../messaging/state/simulationRunSlice", () => ({
  selectSimulationRuns: () => mockRuns,
}));

// Entitlement gate is unrelated to Sync; pass-throughs are sufficient.
jest.mock("../../../messaging/state/entitlementsSlice", () => ({
  canRunNewScenario: () => true,
  scenariosPerModelLimit: () => null,
}));

// ScenarioCard pulls in unrelated UI and can fire its own messaging side-effects.
// Stub it out — the Sync button lives in the panel footer, not inside cards.
// Exposes cancel trigger buttons for the cancel-wiring tests.
jest.mock("../ScenarioCard", () => ({
  ScenarioCard: ({ scenario, onRequestCancel, onConfirmCancel }: any) => (
    <div data-testid={`scenario-card-${scenario.id}`}>
      {scenario.name}
      <button data-testid={`stop-${scenario.id}`} onClick={() => onRequestCancel?.()} />
      <button data-testid={`confirm-cancel-${scenario.id}`} onClick={() => onConfirmCancel?.()} />
    </div>
  ),
}));

const baseProps = {
  documentId: "doc-1",
  pageId: "page-1",
  modelName: "Test Model",
  referenceData: {
    scenarios: [
      {
        id: "scenario-1",
        name: "Baseline",
        isBaseline: true,
        changeRequests: [],
      },
    ],
  } as any,
  onScenariosChange: jest.fn(),
  onSimulate: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSyncState = { isSyncing: false, lastSyncedAt: null, lastError: null };
  mockRuns = [];
});

describe("ScenariosAndRunsPanel — Sync button", () => {
  it("dispatches SYNC_ALL_START and calls syncAll with the expected args on click", () => {
    render(<ScenariosAndRunsPanel {...baseProps} />);

    const syncButton = screen.getByTitle(
      "Sync (push local changes, pull server updates)"
    );
    fireEvent.click(syncButton);

    // 1) Redux dispatch fired with SYNC_ALL_START (other dispatches may also
    //    have fired from useEffect-driven loads on mount; we only assert this
    //    one is present).
    expect(mockDispatch).toHaveBeenCalledWith({ type: "SYNC_ALL_START" });

    // 2) Sender called exactly once with the panel's documentId/pageId/modelName/scenarios.
    expect(mockSyncAll).toHaveBeenCalledTimes(1);
    expect(mockSyncAll).toHaveBeenCalledWith(
      "doc-1",
      "page-1",
      "Test Model",
      baseProps.referenceData.scenarios
    );
  });

  it("renders disabled with a spinning icon while isSyncing=true", () => {
    mockSyncState = { isSyncing: true, lastSyncedAt: null, lastError: null };
    render(<ScenariosAndRunsPanel {...baseProps} />);

    const syncButton = screen.getByTitle("Syncing...");
    expect(syncButton).toBeDisabled();
    expect(syncButton).toHaveAttribute("aria-busy", "true");

    // Icon is the only <svg> child of the button — confirm the spin class is applied.
    const icon = syncButton.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass("animate-spin");
  });

  it("does not call syncAll when clicked while already syncing (concurrent-click guard)", () => {
    mockSyncState = { isSyncing: true, lastSyncedAt: null, lastError: null };
    render(<ScenariosAndRunsPanel {...baseProps} />);

    const syncButton = screen.getByTitle("Syncing...");
    // fireEvent.click does NOT respect the disabled attribute, so this also
    // exercises the in-handler `if (isSyncing) return` guard — confirming
    // defense-in-depth (HTML disabled + handler short-circuit).
    fireEvent.click(syncButton);

    expect(mockSyncAll).not.toHaveBeenCalled();
    // And no SYNC_ALL_START dispatched either — handleSync short-circuits.
    expect(mockDispatch).not.toHaveBeenCalledWith({ type: "SYNC_ALL_START" });
  });
});

describe("ScenariosAndRunsPanel — cancel", () => {
  it("calls cancelSimulationRun on confirm for an active run", () => {
    mockRuns = [{ id: "scenario-1", name: "Baseline", runState: RunState.Running, hasResults: false }];
    render(<ScenariosAndRunsPanel {...baseProps} />);
    fireEvent.click(screen.getByTestId("stop-scenario-1"));
    fireEvent.click(screen.getByTestId("confirm-cancel-scenario-1"));
    expect(mockCancelSimulationRun).toHaveBeenCalledWith("doc-1", "page-1", "scenario-1");
  });
});

