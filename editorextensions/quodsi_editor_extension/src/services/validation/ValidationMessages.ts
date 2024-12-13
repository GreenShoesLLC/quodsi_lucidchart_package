import { ValidationMessage } from "@quodsi/shared";

export class ValidationMessages {
    // Existing messages...
    static missingName(elementType: string, elementId: string): ValidationMessage {
        return {
            type: 'warning',
            message: `${elementType} ${elementId} has no name`,
            elementId
        };
    }

    static isolatedElement(elementType: string, elementId: string): ValidationMessage {
        return {
            type: 'error',
            message: `${elementType} ${elementId} is isolated (no connections)`,
            elementId
        };
    }

    static invalidConnection(connectorId: string, type: 'source' | 'target', elementId: string): ValidationMessage {
        return {
            type: 'error',
            message: `Connector ${connectorId} has invalid ${type} (${elementId})`,
            elementId: connectorId
        };
    }

    static invalidCapacity(elementType: string, elementId: string, minimum: number = 1): ValidationMessage {
        return {
            type: 'error',
            message: `${elementType} ${elementId} has invalid capacity (must be >= ${minimum})`,
            elementId
        };
    }

    // New messages for Activity validation
    static noConnections(elementType: string, elementId: string, direction: 'incoming' | 'outgoing'): ValidationMessage {
        return {
            type: 'warning',
            message: `${elementType} ${elementId} has no ${direction} connections (potential ${direction === 'incoming' ? 'start' : 'end'} activity)`,
            elementId
        };
    }

    static largeBufferCapacity(elementType: string, elementId: string, type: 'input' | 'output'): ValidationMessage {
        return {
            type: 'warning',
            message: `${elementType} ${elementId} has unusually large ${type} buffer capacity`,
            elementId
        };
    }

    static invalidBufferCapacity(elementType: string, elementId: string, type: 'input' | 'output'): ValidationMessage {
        return {
            type: 'error',
            message: `${elementType} ${elementId} has invalid ${type} buffer capacity`,
            elementId
        };
    }

    static missingOperationSteps(elementId: string): ValidationMessage {
        return {
            type: 'error',
            message: `Activity ${elementId} is missing operation steps property`,
            elementId
        };
    }

    static noOperationSteps(elementId: string): ValidationMessage {
        return {
            type: 'warning',
            message: `Activity ${elementId} has no operation steps defined`,
            elementId
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

    static smallInputBuffer(elementId: string): ValidationMessage {
        return {
            type: 'warning',
            message: `Activity ${elementId} input buffer may be too small for incoming flow capacity`,
            elementId
        };
    }

    static circularDependency(elementId: string): ValidationMessage {
        return {
            type: 'warning',
            message: `Potential circular dependency detected involving activity ${elementId}`,
            elementId
        };
    }

    static resourceLeak(elementId: string): ValidationMessage {
        return {
            type: 'warning',
            message: `Activity ${elementId} requests resources but never releases them`,
            elementId
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
    static generatorValidation(category: string, generatorId: string, detail: string): ValidationMessage {
        return {
            type: 'error',
            message: `Generator ${generatorId} has invalid ${category}: ${detail}`,
            elementId: generatorId
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