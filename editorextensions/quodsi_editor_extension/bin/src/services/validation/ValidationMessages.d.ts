import { ValidationMessage } from "@quodsi/shared";
export declare class ValidationMessages {
    static missingName(elementType: string, elementId: string): ValidationMessage;
    static isolatedElement(elementType: string, elementId: string): ValidationMessage;
    static invalidConnection(connectorId: string, type: 'source' | 'target', elementId: string): ValidationMessage;
    static invalidCapacity(elementType: string, elementId: string, minimum?: number): ValidationMessage;
    static noConnections(elementType: string, elementId: string, direction: 'incoming' | 'outgoing'): ValidationMessage;
    static largeBufferCapacity(elementType: string, elementId: string, type: 'input' | 'output'): ValidationMessage;
    static invalidBufferCapacity(elementType: string, elementId: string, type: 'input' | 'output'): ValidationMessage;
    static missingOperationSteps(elementId: string): ValidationMessage;
    static noOperationSteps(elementId: string): ValidationMessage;
    static invalidStepDuration(elementId: string, stepNumber: number): ValidationMessage;
    static unusualStepDuration(elementId: string, stepNumber: number, duration: number): ValidationMessage;
    static duplicateResourceRequest(elementId: string, stepNumber: number): ValidationMessage;
    static invalidResourceQuantity(elementId: string, stepNumber: number): ValidationMessage;
    static unusualCycleTime(elementId: string, type: 'short' | 'long', time: number): ValidationMessage;
    static bufferOverflowRisk(elementId: string): ValidationMessage;
    static smallInputBuffer(elementId: string): ValidationMessage;
    static circularDependency(elementId: string): ValidationMessage;
    static resourceLeak(elementId: string): ValidationMessage;
    static validationSuccess(): ValidationMessage;
    static validationError(error: Error | unknown): ValidationMessage;
    static generatorValidation(category: string, generatorId: string, detail: string): ValidationMessage;
    static missingRequiredElement(elementType: string): ValidationMessage;
}
//# sourceMappingURL=ValidationMessages.d.ts.map