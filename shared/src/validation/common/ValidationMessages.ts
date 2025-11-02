import { ValidationMessage } from "../../types/validation";

export class ValidationMessages {
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

    // Existing messages...
    static missingName(elementType: string, elementId: string, elementName?: string): ValidationMessage {
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            type: 'warning',
            message: `${elementType} ${displayName} has no name`,
            elementId,
            code: 'missing_name'
        };
    }

    static isolatedElement(elementType: string, elementId: string, elementName?: string): ValidationMessage {
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            type: 'error',
            message: `${elementType} ${displayName} is isolated (no connections)`,
            elementId,
            code: 'isolated_element'
        };
    }

    static invalidConnection(connectorId: string, type: 'source' | 'target', elementId: string): ValidationMessage {
        return {
            type: 'error',
            message: `Connector ${connectorId} has invalid ${type} (${elementId})`,
            elementId: connectorId
        };
    }

    static invalidCapacity(elementType: string, elementId: string, minimum: number = 1, elementName?: string): ValidationMessage {
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            type: 'error',
            message: `${elementType} ${displayName} has invalid capacity (must be >= ${minimum})`,
            elementId,
            code: 'invalid_capacity'
        };
    }

    // New messages for Activity validation
    static noConnections(elementType: string, elementId: string, direction: 'incoming' | 'outgoing', elementName?: string): ValidationMessage {
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            type: 'warning',
            message: `${elementType} ${displayName} has no ${direction} connections (potential ${direction === 'incoming' ? 'start' : 'end'} activity)`,
            elementId,
            code: 'no_connections'
        };
    }

    static largeBufferCapacity(elementType: string, elementId: string, type: 'input' | 'output', elementName?: string): ValidationMessage {
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            type: 'warning',
            message: `${elementType} ${displayName} has unusually large ${type} buffer capacity`,
            elementId,
            code: 'large_buffer_capacity'
        };
    }

    static invalidBufferCapacity(elementType: string, elementId: string, type: 'input' | 'output', elementName?: string): ValidationMessage {
        const displayName = this.getDisplayName(elementName, elementId);
        return {
            type: 'error',
            message: `${elementType} ${displayName} has invalid ${type} buffer capacity`,
            elementId,
            code: 'invalid_buffer_capacity'
        };
    }

    static missingOperationSteps(elementId: string, activityName?: string): ValidationMessage {
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            type: 'error',
            message: `Activity ${displayName} is missing operation steps property`,
            elementId,
            code: 'missing_operation_steps'
        };
    }

    static noOperationSteps(elementId: string, activityName?: string): ValidationMessage {
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            type: 'warning',
            message: `Activity ${displayName} has no operation steps defined`,
            elementId,
            code: 'no_operation_steps'
        };
    }

    static invalidStepDuration(elementId: string, stepNumber: number): ValidationMessage {
        return {
            type: 'error',
            message: `Activity ${elementId} operation step ${stepNumber} has invalid duration`,
            elementId
        };
    }

    static unusualStepDuration(elementId: string, stepNumber: number, duration: number): ValidationMessage {
        return {
            type: 'warning',
            message: `Activity ${elementId} operation step ${stepNumber} has unusual duration (${duration} seconds)`,
            elementId
        };
    }

    static duplicateResourceRequest(elementId: string, stepNumber: number): ValidationMessage {
        return {
            type: 'warning',
            message: `Activity ${elementId} operation step ${stepNumber} requests the same resource multiple times`,
            elementId
        };
    }

    static invalidResourceQuantity(elementId: string, stepNumber: number): ValidationMessage {
        return {
            type: 'error',
            message: `Activity ${elementId} operation step ${stepNumber} has invalid resource quantity`,
            elementId
        };
    }

    static unusualCycleTime(elementId: string, type: 'short' | 'long', time: number): ValidationMessage {
        return {
            type: 'warning',
            message: `Activity ${elementId} has unusually ${type} ${type === 'short' ? 'minimum' : 'maximum'} cycle time (${time} seconds)`,
            elementId
        };
    }

    static bufferOverflowRisk(elementId: string): ValidationMessage {
        return {
            type: 'warning',
            message: `Activity ${elementId} may experience input buffer overflow at maximum throughput`,
            elementId
        };
    }

    static smallInputBuffer(elementId: string, activityName?: string): ValidationMessage {
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            type: 'warning',
            message: `Activity ${displayName} input buffer may be too small for incoming flow capacity`,
            elementId,
            code: 'small_input_buffer'
        };
    }

    static circularDependency(elementId: string, activityName?: string): ValidationMessage {
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            type: 'warning',
            message: `Potential circular dependency detected involving activity ${displayName}`,
            elementId,
            code: 'circular_dependency'
        };
    }

    static resourceLeak(elementId: string, activityName?: string): ValidationMessage {
        const displayName = this.getDisplayName(activityName, elementId);
        return {
            type: 'warning',
            message: `Activity ${displayName} requests resources but never releases them`,
            elementId,
            code: 'resource_leak'
        };
    }

    // Existing utility messages...
    static validationSuccess(): ValidationMessage {
        return {
            type: 'info',
            message: 'Model validation passed successfully'
        };
    }

    static validationError(error: Error | unknown): ValidationMessage {
        return {
            type: 'error',
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }

    // Generator Validation
    static generatorValidation(category: string, generatorId: string, detail: string, generatorName?: string): ValidationMessage {
        const displayName = this.getDisplayName(generatorName, generatorId);
        return {
            type: 'error',
            message: `Generator ${displayName} has invalid ${category}: ${detail}`,
            elementId: generatorId,
            code: 'generator_validation'
        };
    }

    // Element Counts
    static missingRequiredElement(elementType: string): ValidationMessage {
        return {
            type: 'error',
            message: `Model must have at least one ${elementType}`,
        };
    }
}