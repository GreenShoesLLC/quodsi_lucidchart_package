import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";

export class ValidationMessages {
    private static idCounter = 0;

    /**
     * Generates a unique ID for a validation issue.
     */
    private static generateId(code: string, elementId?: string): string {
        this.idCounter++;
        const base = elementId ? `${code}_${elementId}` : code;
        return `${base}_${this.idCounter}`;
    }

    /**
     * Formats an element display name for validation messages.
     * Shows name in quotes with ID as fallback if name is empty.
     */
    private static getDisplayName(name: string | undefined, id: string): string {
        if (name && name.trim() !== '') {
            return `'${name}'`;
        }
        return id;
    }

    /**
     * Helper method to create a ValidationIssue from basic parameters.
     * Use this for inline validations that don't have dedicated factory methods.
     */
    static createIssue(
        severity: ValidationSeverity,
        code: string,
        message: string,
        elementId?: string
    ): ValidationIssue {
        return {
            id: this.generateId(code, elementId),
            severity,
            code,
            message,
            elementId
        };
    }

    // Existing messages...
    static missingName(elementType: string, elementId: string, elementName?: string): ValidationIssue {
        const code = 'missing_name';
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `${elementType} ${displayName} has no name`,
            elementId,
            code
        };
    }

    static isolatedElement(elementType: string, elementId: string, elementName?: string): ValidationIssue {
        const code = 'isolated_element';
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.ERROR,
            message: `${elementType} ${displayName} is isolated (no connections)`,
            elementId,
            code
        };
    }

    static invalidConnection(connectorId: string, type: 'source' | 'target', elementId: string): ValidationIssue {
        const code = 'invalid_connection';
        return {
            id: this.generateId(code, connectorId),
            severity: ValidationSeverity.ERROR,
            message: `Connector ${connectorId} has invalid ${type} (${elementId})`,
            elementId: connectorId,
            code
        };
    }

    static invalidCapacity(elementType: string, elementId: string, minimum: number = 1, elementName?: string): ValidationIssue {
        const code = 'invalid_capacity';
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.ERROR,
            message: `${elementType} ${displayName} has invalid capacity (must be >= ${minimum})`,
            elementId,
            code
        };
    }

    // New messages for Activity validation
    static noConnections(elementType: string, elementId: string, direction: 'incoming' | 'outgoing', elementName?: string): ValidationIssue {
        const code = 'no_connections';
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `${elementType} ${displayName} has no ${direction} connections (potential ${direction === 'incoming' ? 'start' : 'end'} activity)`,
            elementId,
            code
        };
    }

    static largeQueueCapacity(elementType: string, elementId: string, type: 'inbound' | 'outbound', elementName?: string): ValidationIssue {
        const code = 'large_queue_capacity';
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `${elementType} ${displayName} has unusually large ${type} queue capacity`,
            elementId,
            code
        };
    }

    static invalidQueueCapacity(elementType: string, elementId: string, type: 'inbound' | 'outbound', elementName?: string): ValidationIssue {
        const code = 'invalid_queue_capacity';
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.ERROR,
            message: `${elementType} ${displayName} has invalid ${type} queue capacity`,
            elementId,
            code
        };
    }

    static missingActions(elementId: string, activityName?: string): ValidationIssue {
        const code = 'missing_actions';
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.ERROR,
            message: `Activity ${displayName} is missing actions property`,
            elementId,
            code
        };
    }

    static noActions(elementId: string, activityName?: string): ValidationIssue {
        const code = 'no_actions';
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `Activity ${displayName} has no actions defined`,
            elementId,
            code
        };
    }

    static invalidStepDuration(elementId: string, stepNumber: number): ValidationIssue {
        const code = 'invalid_step_duration';
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.ERROR,
            message: `Activity ${elementId} operation step ${stepNumber} has invalid duration`,
            elementId,
            code
        };
    }

    static unusualStepDuration(elementId: string, stepNumber: number, duration: number): ValidationIssue {
        const code = 'unusual_step_duration';
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `Activity ${elementId} operation step ${stepNumber} has unusual duration (${duration} seconds)`,
            elementId,
            code
        };
    }

    static duplicateResourceRequest(elementId: string, stepNumber: number): ValidationIssue {
        const code = 'duplicate_resource_request';
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `Activity ${elementId} operation step ${stepNumber} requests the same resource multiple times`,
            elementId,
            code
        };
    }

    static invalidResourceQuantity(elementId: string, stepNumber: number): ValidationIssue {
        const code = 'invalid_resource_quantity';
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.ERROR,
            message: `Activity ${elementId} operation step ${stepNumber} has invalid resource quantity`,
            elementId,
            code
        };
    }

    static unusualCycleTime(elementId: string, type: 'short' | 'long', time: number): ValidationIssue {
        const code = 'unusual_cycle_time';
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `Activity ${elementId} has unusually ${type} ${type === 'short' ? 'minimum' : 'maximum'} cycle time (${time} seconds)`,
            elementId,
            code
        };
    }

    static circularDependency(elementId: string, activityName?: string): ValidationIssue {
        const code = 'circular_dependency';
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `Potential circular dependency detected involving activity ${displayName}`,
            elementId,
            code
        };
    }

    static resourceLeak(elementId: string, activityName?: string): ValidationIssue {
        const code = 'resource_leak';
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: ValidationSeverity.WARNING,
            message: `Activity ${displayName} requests resources but never releases them`,
            elementId,
            code
        };
    }

    // Existing utility messages...
    static validationSuccess(): ValidationIssue {
        const code = 'validation_success';
        return {
            id: this.generateId(code),
            severity: ValidationSeverity.INFO,
            message: 'Model validation passed successfully',
            code
        };
    }

    static validationError(error: Error | unknown): ValidationIssue {
        const code = 'validation_error';
        return {
            id: this.generateId(code),
            severity: ValidationSeverity.ERROR,
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code
        };
    }

    // Generator Validation
    static generatorValidation(category: string, generatorId: string, detail: string, generatorName?: string): ValidationIssue {
        const code = 'generator_validation';
        const displayName = this.getDisplayName(generatorName, generatorId);
        return {
            id: this.generateId(code, generatorId),
            severity: ValidationSeverity.ERROR,
            message: `Generator ${displayName} has invalid ${category}: ${detail}`,
            elementId: generatorId,
            code
        };
    }

    // Element Counts
    static missingRequiredElement(elementType: string): ValidationIssue {
        const code = 'missing_required_element';
        return {
            id: this.generateId(code),
            severity: ValidationSeverity.ERROR,
            message: `Model must have at least one ${elementType}`,
            code
        };
    }
}