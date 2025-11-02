import { EnvelopeBase, EnvelopeMessageType, ValidationIssue } from '@quodsi/shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';

// Create component-specific logger
const logger = debugService.forComponent('ModelOpsMapper');

/**
 * Maps model operations messages to reducer actions
 * Handles validation, conversion, model removal, and results page creation
 * 
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapModelOps(msg: EnvelopeBase): MessagingAction | null {
  // Skip messages that aren't model operations-related
  if (
    msg.type !== EnvelopeMessageType.MODEL_VALIDATION_RESULT &&
    msg.type !== EnvelopeMessageType.MODEL_CONVERSION_RESULT &&
    msg.type !== EnvelopeMessageType.MODEL_REMOVE_RESULT &&
    msg.type !== EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT
  ) {
    return null;
  }

  debugService.debug(`ModelOps mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.MODEL_VALIDATION_RESULT:
      // Extract validation result data
      const validationData = msg.data as {
        isValid: boolean;
        issues: ValidationIssue[];
        summary: {
          errorCount: number;
          warningCount: number;
          infoCount: number;
        };
      };

      // Map to validation result action (pass through issues and summary directly)
      return {
        type: 'VALIDATION_RESULT',
        isValid: validationData.isValid,
        issues: validationData.issues,
        summary: validationData.summary
      };

    case EnvelopeMessageType.MODEL_CONVERSION_RESULT:
      // Extract conversion result data
      const conversionData = msg.data as {
        success: boolean;
        convertedElementIds: string[];
        error?: string;
      };

      // If error, log it
      if (!conversionData.success && conversionData.error) {
        logger.error(`Conversion failed: ${conversionData.error}`);
        return null;
      }

      // Success - trigger a UI refresh to ensure proper state transition
      logger.log('Model conversion successful, dispatching MODEL_CONVERSION_SUCCESS action');
      return {
        type: 'MODEL_CONVERSION_SUCCESS',
        success: true
      };

    case EnvelopeMessageType.MODEL_REMOVE_RESULT:
      // Extract remove result data
      const removeData = msg.data as {
        success: boolean;
        error?: string;
      };

      logger.log('Processing MODEL_REMOVE_RESULT:', removeData);

      // If error, log it
      if (!removeData.success && removeData.error) {
        logger.error('Model removal failed:', removeData.error);
        return null;
      }

      // Success - trigger a UI refresh to ensure proper state transition
      logger.log('Model removal successful, dispatching MODEL_REMOVAL_SUCCESS action');
      return {
        type: 'MODEL_REMOVAL_SUCCESS',
        success: true
      };

    case EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT:
      // Extract results page create result data
      const resultsPageData = msg.data as {
        success: boolean;
        pageId?: string;
        error?: string;
      };

      // If error, log it
      if (!resultsPageData.success && resultsPageData.error) {
        logger.error(`Results page creation failed: ${resultsPageData.error}`);
        return null;
      }

      // Success doesn't require state changes
      return null;

    default:
      return null;
  }
}
