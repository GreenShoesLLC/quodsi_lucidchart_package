import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Validation issue structure
 */
export interface ValidationIssue {
  /** Unique issue ID */
  id: string;

  /** Element ID the issue relates to */
  elementId?: string;

  /** Severity level */
  severity: ValidationSeverity;

  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Sent to request model validation
 */
export interface ModelValidateMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_VALIDATE;
  data: {
    /** Document ID to validate */
    documentId: string;
  };
}

/**
 * Sent with validation results
 */
export interface ModelValidationResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_VALIDATION_RESULT;
  data: {
    /** Is the model valid */
    isValid: boolean;

    /** List of validation issues */
    issues: ValidationIssue[];

    /** Summary of validation */
    summary: {
      /** Count of error severity issues */
      errorCount: number;

      /** Count of warning severity issues */
      warningCount: number;

      /** Count of info severity issues */
      infoCount: number;
    };
  };
}

/**
 * Sent to request model conversion
 */
export interface ModelConvertMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_CONVERT;
  data: {
    /** Document ID to convert */
    documentId: string;

    /** Element ID to convert (if converting a single element) */
    elementId?: string;

    /** Target type to convert to */
    targetType?: string;
  };
}

/**
 * Sent with conversion results
 */
export interface ModelConversionResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_CONVERSION_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** List of converted element IDs */
    convertedElementIds: string[];

    /** Error message if conversion failed */
    error?: string;
  };
}

/**
 * Sent to request model removal
 */
export interface ModelRemoveMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_REMOVE;
  data: {
    /** Document ID to remove Quodsi model from */
    documentId: string;
  };
}

/**
 * Sent with model removal results
 */
export interface ModelRemoveResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_REMOVE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Error message if removal failed */
    error?: string;
  };
}

/**
 * Sent to request results page creation
 */
export interface ResultsPageCreateMessage extends EnvelopeBase {
  type: EnvelopeMessageType.RESULTS_PAGE_CREATE;
  data: {
    /** Job ID of the completed simulation */
    jobId: string;

    /** Document ID to create results page in */
    documentId: string;

    /** Optional page title */
    pageTitle?: string;
  };
}

/**
 * Sent with results page creation results
 */
export interface ResultsPageCreateResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Created page ID */
    pageId?: string;

    /** Error message if creation failed */
    error?: string;
  };
}

/**
 * Sent to request serialized model JSON
 */
export interface ModelJsonRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_JSON_REQUEST;
  data: {
    /** Document ID to get model JSON from */
    documentId: string;
  };
}

/**
 * Sent with serialized model JSON
 */
export interface ModelJsonResponseMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_JSON_RESPONSE;
  data: {
    /** Success flag */
    success: boolean;

    /** Serialized model JSON (same as sent to simulation API) */
    modelJson?: any;

    /** Error message if serialization failed */
    error?: string;
  };
}

/** Union type of all model operations messages */
export type ModelOpsMessage =
  | ModelValidateMessage
  | ModelValidationResultMessage
  | ModelConvertMessage
  | ModelConversionResultMessage
  | ModelRemoveMessage
  | ModelRemoveResultMessage
  | ModelJsonRequestMessage
  | ModelJsonResponseMessage
  | ResultsPageCreateMessage
  | ResultsPageCreateResultMessage;
