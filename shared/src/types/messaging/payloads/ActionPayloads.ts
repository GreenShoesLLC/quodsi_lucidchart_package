// src/types/messaging/payloads/ActionPayloads.ts
import { JsonObject } from '../JsonTypes';
import { ValidationResult } from '../../validation/ValidationTypes';
import { PageStatus } from '../../PageStatus';

/**
 * Enum defining all possible action types in the application.
 * This consolidates the various command/action message types into a single enumeration.
 */
export enum ActionType {
    // Model actions
    CONVERT_PAGE = 'convertPage',
    REMOVE_MODEL = 'removeModel',

    // Element actions
    UPDATE_ELEMENT_DATA = 'updateElementData',
    CONVERT_ELEMENT = 'convertElement',

    // Validation actions
    VALIDATE_MODEL = 'validateModel',

    // Simulation actions
    SIMULATE_MODEL = 'simulateModel',
    SIMULATION_STATUS_CHECK = 'simulationStatusCheck',
    CREATE_RESULTS_PAGE = 'createResultsPage',
    VIEW_SIMULATION_RESULTS = 'viewSimulationResults',
    MARK_RESULTS_VIEWED = 'markResultsViewed'
}

/**
 * Common interface for both action request and response to enable
 * type discrimination with the actionType field.
 */
export interface ActionBase {
    actionType: ActionType;
}

/**
 * Interface for action request data with specific fields for different action types.
 */
export interface ActionRequestData {
    // Common fields
    documentId?: string;
    elementId?: string;

    // For UPDATE_ELEMENT_DATA
    type?: string; // SimulationObjectType as string
    data?: JsonObject;

    // For CONVERT_ELEMENT
    // The element type to convert to
    convertToType?: string;

    // For SIMULATE_MODEL
    scenarioName?: string;

    // For SIMULATION_STATUS_CHECK
    scenarioId?: string;

    // For CREATE_RESULTS_PAGE
    pageName?: string;

    // Error handling fields
    errorMessage?: string;
    errorCode?: string;
}

/**
 * Interface for action response data with specific fields for different action responses.
 */
export interface ActionResponseData {
    // Common fields
    documentId?: string;

    // For UPDATE_SUCCESS
    elementId?: string;

    // For VALIDATION_RESULT
    validationResult?: ValidationResult;

    // For SIMULATION_STATUS_UPDATE
    pageStatus?: PageStatus;
    newResultsAvailable?: boolean;

    // For error cases
    errorMessage?: string;
    errorCode?: string;
}

/**
 * Complete interface for action request messages.
 */
export interface ActionRequest extends ActionBase {
    data?: ActionRequestData;
}

/**
 * Complete interface for action response messages.
 */
export interface ActionResponse extends ActionBase {
    success: boolean;
    data?: ActionResponseData;
}