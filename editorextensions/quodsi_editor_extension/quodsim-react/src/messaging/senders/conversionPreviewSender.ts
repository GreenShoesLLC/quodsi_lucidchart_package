import { EnvelopeMessageType, ElementMappingOverride } from '@quodsi/shared';
import { useSender } from './useSender';
import { useMessagingDispatch } from '../MessageContext';

/**
 * Custom hook that provides typed functions for sending conversion preview messages
 *
 * @returns Object containing conversion preview message sender functions
 */
export function useConversionPreviewSender() {
    const send = useSender();
    const dispatch = useMessagingDispatch();

    /**
     * Request a conversion preview from the extension
     * This triggers analysis of the current page
     */
    const requestPreview = () => {
        // Dispatch loading state
        dispatch({ type: 'CONVERSION_PREVIEW_LOADING' });

        // Send preview request to extension
        send(EnvelopeMessageType.CONVERSION_PREVIEW_REQUEST, {});
    };

    /**
     * Apply the conversion with user overrides
     *
     * @param pageId The page ID being converted
     * @param overrides Array of user overrides to apply
     */
    const applyConversion = (pageId: string, overrides: ElementMappingOverride[]) => {
        // Dispatch applying state
        dispatch({ type: 'CONVERSION_PREVIEW_APPLYING' });

        // Send apply request to extension
        send(EnvelopeMessageType.CONVERSION_APPLY, {
            pageId,
            overrides
        });
    };

    /**
     * Close the preview panel without applying
     */
    const closePreview = () => {
        dispatch({ type: 'CONVERSION_PREVIEW_CLOSE' });
    };

    /**
     * Open the preview panel (triggers a preview request)
     */
    const openPreview = () => {
        dispatch({ type: 'CONVERSION_PREVIEW_OPEN' });
        requestPreview();
    };

    /**
     * Apply conversion with all default mappings (no preview)
     * Sends CONVERSION_APPLY with empty overrides array.
     * The handler will analyze the page and apply all proposed types.
     * Isolated items (no connections) will be skipped.
     */
    const applyDefaults = () => {
        // Dispatch applying state
        dispatch({ type: 'CONVERSION_PREVIEW_APPLYING' });

        // Send apply request with empty overrides - uses all proposed defaults
        // Handler will use current page from viewport
        send(EnvelopeMessageType.CONVERSION_APPLY, {
            pageId: null,
            overrides: []
        });
    };

    return {
        requestPreview,
        applyConversion,
        closePreview,
        openPreview,
        applyDefaults
    };
}
