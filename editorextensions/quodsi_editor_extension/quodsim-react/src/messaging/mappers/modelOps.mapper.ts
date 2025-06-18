import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
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
        issues: Array<{
          id: string;
          elementId?: string;
          severity: string;
          code: string;
          message: string;
          context?: Record<string, unknown>;
        }>;
        summary: {
          errorCount: number;
          warningCount: number;
          infoCount: number;
        };
      };

      // Convert issues to the expected format for VALIDATION_RESULT
      const errors = validationData.issues.map(issue => ({
        id: issue.id,
        elementId: issue.elementId,
        type: issue.code,
        message: issue.message,
        severity: issue.severity as 'error' | 'warning' | 'info'
      }));

      // Map to validation result action
      return {
        type: 'VALIDATION_RESULT',
        isValid: validationData.isValid,
        errors: errors
      };

    case EnvelopeMessageType.MODEL_CONVERSION_RESULT:
      // Extract conversion result data
      const conversionData = msg.data as {
        success: boolean;
        convertedElementIds: string[];
        error?: string;
      };

      // If error, map to auth error action since we don't have a dedicated app error
      if (!conversionData.success && conversionData.error) {
        return {
          type: 'AUTH_ERROR',
          error: `Conversion failed: ${conversionData.error}`
        };
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

      // If error, map to auth error action
      if (!removeData.success && removeData.error) {
        logger.error('Model removal failed:', removeData.error);
        return {
          type: 'AUTH_ERROR',
          error: `Model removal failed: ${removeData.error}`
        };
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

      // If error, map to auth error action
      if (!resultsPageData.success && resultsPageData.error) {
        return {
          type: 'AUTH_ERROR',
          error: `Results page creation failed: ${resultsPageData.error}`
        };
      }

      // Success doesn't require state changes
      return null;

    default:
      return null;
  }
}
