import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';
import { ConversionPreviewData, ElementMappingOverride } from '../../types/ConversionPreview';

// Re-export types for convenience
export { ConversionPreviewData, ElementMappingOverride };

/**
 * Sent to request conversion preview data
 */
export interface ConversionPreviewRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CONVERSION_PREVIEW_REQUEST;
  data: {
    /** Document ID to preview conversion for */
    documentId?: string;
  };
}

/**
 * Sent with conversion preview data
 */
export interface ConversionPreviewResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CONVERSION_PREVIEW_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Preview data with element mappings */
    previewData?: ConversionPreviewData;

    /** Error message if preview generation failed */
    error?: string;
  };
}

/**
 * Sent to apply conversion with user-specified mappings
 */
export interface ConversionApplyMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CONVERSION_APPLY;
  data: {
    /** Page ID to apply conversion to */
    pageId: string;

    /** User overrides for element type mappings */
    overrides: ElementMappingOverride[];
  };
}

/**
 * Sent with conversion apply results
 */
export interface ConversionApplyResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CONVERSION_APPLY_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** List of converted element IDs */
    convertedElementIds?: string[];

    /** Error message if conversion failed */
    error?: string;
  };
}

/** Union type of all conversion preview messages */
export type ConversionPreviewMessage =
  | ConversionPreviewRequestMessage
  | ConversionPreviewResultMessage
  | ConversionApplyMessage
  | ConversionApplyResultMessage;
