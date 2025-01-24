import { Duration } from "./Duration";
export interface OperationStep {
    requirementId: string | null;
    quantity: number;
    duration: Duration;
}
export declare function createOperationStep(duration: Duration, // duration required parameter
options?: Partial<Omit<OperationStep, 'duration'>>): OperationStep;
//# sourceMappingURL=OperationStep.d.ts.map