/**
 * Conversion Preview State Slice
 * Manages state for the conversion preview panel
 */

import {
    ConversionPreviewData,
    SimulationObjectType
} from '@quodsi/shared';

// State shape
export interface ConversionPreviewState {
    // Whether the preview panel is visible
    isVisible: boolean;

    // Whether we're loading the preview data
    isLoading: boolean;

    // Whether we're applying the conversion
    isApplying: boolean;

    // The preview data from the extension
    previewData: ConversionPreviewData | null;

    // User overrides for element types (elementId -> new type)
    userOverrides: Record<string, SimulationObjectType | null>;

    // Error message if any
    error: string | null;

    // Last updated timestamp
    lastUpdated?: number;

    // Whether the auto-mapped details section is expanded
    showDetails: boolean;

    // ID of the item currently being edited (for override panel)
    editingItemId: string | null;
}

// Initial state
export const initialConversionPreviewState: ConversionPreviewState = {
    isVisible: false,
    isLoading: false,
    isApplying: false,
    previewData: null,
    userOverrides: {},
    error: null,
    lastUpdated: undefined,
    showDetails: false,
    editingItemId: null
};

// Action types
export type ConversionPreviewAction =
    | { type: 'CONVERSION_PREVIEW_OPEN' }
    | { type: 'CONVERSION_PREVIEW_LOADING' }
    | { type: 'CONVERSION_PREVIEW_RECEIVED'; data: ConversionPreviewData }
    | { type: 'CONVERSION_PREVIEW_ERROR'; error: string }
    | { type: 'CONVERSION_PREVIEW_CLOSE' }
    | { type: 'CONVERSION_PREVIEW_OVERRIDE'; elementId: string; targetType: SimulationObjectType | null }
    | { type: 'CONVERSION_PREVIEW_APPLYING' }
    | { type: 'CONVERSION_PREVIEW_APPLIED' }
    | { type: 'CONVERSION_PREVIEW_APPLY_ERROR'; error: string }
    | { type: 'CONVERSION_PREVIEW_RESET' }
    | { type: 'CONVERSION_PREVIEW_TOGGLE_DETAILS' }
    | { type: 'CONVERSION_PREVIEW_SET_EDITING'; elementId: string | null }
    | { type: 'MODEL_REMOVAL_SUCCESS'; success: boolean };

// Reducer
export function conversionPreviewReducer(
    state: ConversionPreviewState = initialConversionPreviewState,
    action: ConversionPreviewAction
): ConversionPreviewState {
    switch (action.type) {
        case 'CONVERSION_PREVIEW_OPEN':
            return {
                ...state,
                isVisible: true,
                error: null,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_LOADING':
            return {
                ...state,
                isLoading: true,
                error: null,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_RECEIVED':
            return {
                ...state,
                isVisible: true,
                isLoading: false,
                previewData: action.data,
                userOverrides: {}, // Reset overrides when new data arrives
                error: null,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_ERROR':
            return {
                ...state,
                isLoading: false,
                isApplying: false,
                error: action.error,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_CLOSE':
            return {
                ...initialConversionPreviewState,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_OVERRIDE':
            return {
                ...state,
                userOverrides: {
                    ...state.userOverrides,
                    [action.elementId]: action.targetType
                },
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_APPLYING':
            return {
                ...state,
                isApplying: true,
                error: null,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_APPLIED':
            // Close the preview panel after successful application
            return {
                ...initialConversionPreviewState,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_APPLY_ERROR':
            return {
                ...state,
                isApplying: false,
                error: action.error,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_RESET':
            return {
                ...initialConversionPreviewState,
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_TOGGLE_DETAILS':
            return {
                ...state,
                showDetails: !state.showDetails,
                editingItemId: null, // Close any open edit panel when toggling
                lastUpdated: Date.now()
            };

        case 'CONVERSION_PREVIEW_SET_EDITING':
            return {
                ...state,
                editingItemId: action.elementId,
                lastUpdated: Date.now()
            };

        case 'MODEL_REMOVAL_SUCCESS':
            // Auto-close the preview panel when model is removed
            return {
                ...initialConversionPreviewState,
                lastUpdated: Date.now()
            };

        default:
            return state;
    }
}
