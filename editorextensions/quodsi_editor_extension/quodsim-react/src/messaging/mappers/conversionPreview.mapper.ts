import { EnvelopeBase, EnvelopeMessageType, ConversionPreviewData } from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';

// Create component-specific logger
const logger = debugService.forComponent('ConversionPreviewMapper');

/**
 * Maps conversion preview messages to reducer actions
 * Handles preview result and apply result messages
 *
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapConversionPreview(msg: EnvelopeBase): MessagingAction | null {
    // Skip messages that aren't conversion preview-related
    if (
        msg.type !== EnvelopeMessageType.CONVERSION_PREVIEW_RESULT &&
        msg.type !== EnvelopeMessageType.CONVERSION_APPLY_RESULT
    ) {
        return null;
    }

    logger.log(`ConversionPreview mapper processing: ${msg.type}`);

    switch (msg.type) {
        case EnvelopeMessageType.CONVERSION_PREVIEW_RESULT: {
            const data = msg.data as ConversionPreviewData | { error: string };

            // Check if it's an error response
            if ('error' in data && typeof data.error === 'string') {
                logger.error(`Preview request failed: ${data.error}`);
                return {
                    type: 'CONVERSION_PREVIEW_ERROR',
                    error: data.error
                };
            }

            // It's a successful preview result
            const previewData = data as ConversionPreviewData;
            logger.log('Preview data received:', {
                pageId: previewData.pageId,
                mappingsCount: previewData.mappings?.length ?? 0
            });

            return {
                type: 'CONVERSION_PREVIEW_RECEIVED',
                data: previewData
            };
        }

        case EnvelopeMessageType.CONVERSION_APPLY_RESULT: {
            const data = msg.data as {
                success: boolean;
                error?: string;
                result?: any;
            };

            if (!data.success) {
                logger.error(`Conversion apply failed: ${data.error}`);
                return {
                    type: 'CONVERSION_PREVIEW_APPLY_ERROR',
                    error: data.error || 'Unknown error occurred'
                };
            }

            logger.log('Conversion applied successfully');
            return {
                type: 'CONVERSION_PREVIEW_APPLIED'
            };
        }

        default:
            return null;
    }
}
