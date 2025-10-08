import { Duration } from "./Duration";
import { StateModification } from "./StateModification";

export interface OperationStep {
    name?: string;
    requirementId: string | null;
    quantity: number;
    duration: Duration;
    keepResource?: boolean;
    stateModifications?: StateModification[];
}

export function createOperationStep(
    duration: Duration,  // duration required parameter
    options: Partial<Omit<OperationStep, 'duration'>> = {}
): OperationStep {
    return {
        name: options.name,
        requirementId: options.requirementId ?? null,
        quantity: options.quantity ?? 1,
        duration,
        keepResource: options.keepResource ?? false,
        stateModifications: options.stateModifications ?? []
    };
}