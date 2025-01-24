import { Duration } from "./Duration";

export interface OperationStep {
    requirementId: string | null;
    quantity: number;
    duration: Duration;
}

export function createOperationStep(
    duration: Duration,  // duration required parameter
    options: Partial<Omit<OperationStep, 'duration'>> = {}
): OperationStep {
    return {
        requirementId: options.requirementId ?? null,
        quantity: options.quantity ?? 1,
        duration
    };
}