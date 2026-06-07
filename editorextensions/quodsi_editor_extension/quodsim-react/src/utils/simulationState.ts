import { PageStatus, RunState } from "@quodsi/lucid-shared";

export interface SimulationStateOutput {
    buttonLabel: string;
    statusText: string;
}

export const getStatusClass = (statusText: string): string => {
    switch (statusText) {
        case 'Queued':
            return 'text-yellow-500';
        case 'Running':
            return 'text-blue-500';
        case 'Ran with Errors':
            return 'text-red-500';
        case 'Output Ready':
            return 'text-green-500';
        default:
            return 'text-gray-500';
    }
};

export const getSimulationState = (
    status: PageStatus | null,
    isChecking: boolean
): SimulationStateOutput => {
    if (!status?.simulationRuns || !Array.isArray(status.simulationRuns)) {
        return { buttonLabel: "Simulate", statusText: "No Status or Runs" };
    }

    // Find the baseline run via the isBaseline flag. Replaces the
    // legacy convention of detecting baselines by id === '00000000-...'
    // — that broke when scenarios moved to a database with a global PK.
    const baselineRun = status.simulationRuns.find(
        (s: { isBaseline?: boolean }) => s.isBaseline === true
    );

    if (!baselineRun) {
        return { buttonLabel: "Simulate", statusText: "Ready" };
    }

    switch (baselineRun.runState) {
        case RunState.Queued:
            return { buttonLabel: "Queued...", statusText: "Queued" };
        case RunState.Running:
            return { buttonLabel: "Simulating...", statusText: "Running" };
        case RunState.RanWithErrors:
            return { buttonLabel: "Simulate", statusText: "Ran with Errors" };
        case RunState.RanSuccessfully:
            return { buttonLabel: "Simulate Again?", statusText: "Output Ready" };
        case RunState.NotRun:
        default:
            return { buttonLabel: "Simulate", statusText: "Ready" };
    }
};