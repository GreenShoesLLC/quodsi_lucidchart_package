import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { MessagingAction } from '../reducer';
import { debugService } from '../utils/debugService';

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

      // Map to validation result action
      return {
        type: 'VALIDATION_RESULT',
        isValid: validationData.isValid,
        errorCount: validationData.summary.errorCount,
        warningCount: validationData.summary.warningCount,
        infoCount: validationData.summary.infoCount,
        messages: validationData.issues.map(issue => ({
          type: issue.severity,
          message: issue.message,
          elementId: issue.elementId,
          code: issue.code
        }))
      };

    case EnvelopeMessageType.MODEL_CONVERSION_RESULT:
      // Extract conversion result data
      const conversionData = msg.data as {
        success: boolean;
        convertedElementIds: string[];
        error?: string;
      };

      // If error, map to app error action
      if (!conversionData.success && conversionData.error) {
        return {
          type: 'APP_ERROR',
          error: `Conversion failed: ${conversionData.error}`
        };
      }

      // Success doesn't require state changes - selection update will follow
      return null;

    case EnvelopeMessageType.MODEL_REMOVE_RESULT:
      // Extract remove result data
      const removeData = msg.data as {
        success: boolean;
        error?: string;
      };

      // If error, map to app error action
      if (!removeData.success && removeData.error) {
        return {
          type: 'APP_ERROR',
          error: `Model removal failed: ${removeData.error}`
        };
      }

      // Success doesn't require state changes - selection update will follow
      return null;

    case EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT:
      // Extract results page create result data
      const resultsPageData = msg.data as {
        success: boolean;
        pageId?: string;
        error?: string;
      };

      // If error, map to app error action
      if (!resultsPageData.success && resultsPageData.error) {
        return {
          type: 'APP_ERROR',
          error: `Results page creation failed: ${resultsPageData.error}`
        };
      }

      // Success doesn't require state changes
      return null;

    default:
      return null;
  }
}
