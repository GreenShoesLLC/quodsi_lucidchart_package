import { PageStatus, RunState } from "@quodsi/shared";

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

    const emptyGuidRun = status.simulationRuns.find((s: { id: string }) =>
        s.id === "00000000-0000-0000-0000-000000000000"
    );

    if (!emptyGuidRun) {
        return { buttonLabel: "Simulate", statusText: "Ready" };
    }

    switch (emptyGuidRun.runState) {
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