import { PageStatus, RunState } from "@quodsi/shared";

export interface SimulationStateOutput {
    buttonLabel: string;
    statusText: string;
}

export const getStatusClass = (statusText: string): string => {
    switch (statusText) {
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
    if (!status?.scenarios || !Array.isArray(status.scenarios)) {
        return { buttonLabel: "Simulate", statusText: "No Status or Scenarios" };
    }

    const emptyGuidScenario = status.scenarios.find(s =>
        s.id === "00000000-0000-0000-0000-000000000000"
    );

    if (!emptyGuidScenario) {
        return { buttonLabel: "Simulate", statusText: "Ready" };
    }

    switch (emptyGuidScenario.runState) {
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