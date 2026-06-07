import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";
export declare class ValidationMessages {
    private static idCounter;
    /**
     * Generates a unique ID for a validation issue.
     */
    private static generateId;
    /**
     * Formats an element display name for validation messages.
     * Shows name in quotes with ID as fallback if name is empty.
     */
    private static getDisplayName;
    /**
     * Helper method to create a ValidationIssue from basic parameters.
     * Use this for inline validations that don't have dedicated factory methods.
     */
    static createIssue(severity: ValidationSeverity, code: string, message: string, elementId?: string): ValidationIssue;
    static missingName(elementType: string, elementId: string, elementName?: string): ValidationIssue;
    static isolatedElement(elementType: string, elementId: string, elementName?: string): ValidationIssue;
    static invalidConnection(connectorId: string, type: 'source' | 'target', elementId: string): ValidationIssue;
    static invalidCapacity(elementType: string, elementId: string, minimum?: number, elementName?: string): ValidationIssue;
    static noConnections(elementType: string, elementId: string, direction: 'incoming' | 'outgoing', elementName?: string): ValidationIssue;
    static largeQueueCapacity(elementType: string, elementId: string, type: 'inbound' | 'outbound', elementName?: string): ValidationIssue;
    static invalidQueueCapacity(elementType: string, elementId: string, type: 'inbound' | 'outbound', elementName?: string): ValidationIssue;
    static missingActions(elementId: string, activityName?: string): ValidationIssue;
    static noActions(elementId: string, activityName?: string): ValidationIssue;
    static invalidStepDuration(elementId: string, stepNumber: number): ValidationIssue;
    static unusualStepDuration(elementId: string, stepNumber: number, duration: number): ValidationIssue;
    static duplicateResourceRequest(elementId: string, stepNumber: number): ValidationIssue;
    static invalidResourceQuantity(elementId: string, stepNumber: number): ValidationIssue;
    static unusualCycleTime(elementId: string, type: 'short' | 'long', time: number): ValidationIssue;
    static circularDependency(elementId: string, activityName?: string): ValidationIssue;
    static resourceLeak(elementId: string, activityName?: string): ValidationIssue;
    static validationSuccess(): ValidationIssue;
    static validationError(error: Error | unknown): ValidationIssue;
    static generatorValidation(category: string, generatorId: string, detail: string, generatorName?: string): ValidationIssue;
    static missingRequiredElement(elementType: string): ValidationIssue;
}
//# sourceMappingURL=ValidationMessages.d.ts.map