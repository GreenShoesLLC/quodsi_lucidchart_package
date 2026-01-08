import { useMemo, useCallback } from 'react';
import { useConversionPreviewState, useMessagingDispatch } from '../MessageContext';
import { useConversionPreviewSender } from '../senders/conversionPreviewSender';
import {
    SimulationObjectType,
    ElementMappingPreview,
    ElementMappingOverride,
    ConversionPreviewSummary,
    DiagramElementKind
} from '@quodsi/shared';

/**
 * Merged mapping that combines proposed type with any user override
 */
export interface MergedMapping extends ElementMappingPreview {
    finalType: SimulationObjectType | null;
    hasOverride: boolean;
}

/**
 * Grouped auto-mapped items by simulation type
 */
export interface GroupedAutoMapped {
    generators: MergedMapping[];
    activities: MergedMapping[];
    connectors: MergedMapping[];
    skipped: MergedMapping[];
}

/**
 * Enhanced hook for conversion preview that provides
 * state, computed properties, and actions for the conversion preview UI
 */
export function useConversionPreview() {
    const state = useConversionPreviewState();
    const dispatch = useMessagingDispatch();
    const sender = useConversionPreviewSender();

    /**
     * Compute merged mappings (proposed + overrides)
     */
    const mergedMappings = useMemo((): MergedMapping[] => {
        if (!state.previewData?.mappings) {
            return [];
        }

        return state.previewData.mappings.map(mapping => {
            const hasOverride = mapping.elementId in state.userOverrides;
            // Prioritize currentType (what's stored) over proposedType (analysis suggestion)
            const finalType = hasOverride
                ? state.userOverrides[mapping.elementId]
                : (mapping.currentType ?? mapping.proposedType);

            return {
                ...mapping,
                finalType,
                hasOverride
            };
        });
    }, [state.previewData?.mappings, state.userOverrides]);

    /**
     * Compute dynamic summary based on final types (with overrides applied)
     */
    const dynamicSummary = useMemo((): ConversionPreviewSummary => {
        const summary: ConversionPreviewSummary = {
            totalBlocks: 0,
            totalLines: 0,
            generators: 0,
            activities: 0,
            resources: 0,
            entities: 0,
            connectors: 0,
            skipped: 0
        };

        for (const mapping of mergedMappings) {
            // Count by element kind
            if (mapping.elementKind === DiagramElementKind.BLOCK) {
                summary.totalBlocks++;
            } else {
                summary.totalLines++;
            }

            // Count by final type (with overrides applied)
            switch (mapping.finalType) {
                case SimulationObjectType.Generator:
                    summary.generators++;
                    break;
                case SimulationObjectType.Activity:
                    summary.activities++;
                    break;
                case SimulationObjectType.Resource:
                    summary.resources++;
                    break;
                case SimulationObjectType.Entity:
                    summary.entities++;
                    break;
                case SimulationObjectType.Connector:
                    summary.connectors++;
                    break;
                case null:
                    summary.skipped++;
                    break;
            }
        }

        return summary;
    }, [mergedMappings]);

    /**
     * Items that are isolated (no connections) and need user decision
     */
    const unmappedItems = useMemo((): MergedMapping[] => {
        return mergedMappings.filter(m => m.isIsolated);
    }, [mergedMappings]);

    /**
     * Items that are auto-mapped based on connection patterns
     */
    const autoMappedItems = useMemo((): MergedMapping[] => {
        return mergedMappings.filter(m => !m.isIsolated);
    }, [mergedMappings]);

    /**
     * Auto-mapped items grouped by their final type
     */
    const groupedAutoMapped = useMemo((): GroupedAutoMapped => {
        return {
            generators: autoMappedItems.filter(m => m.finalType === SimulationObjectType.Generator),
            activities: autoMappedItems.filter(m => m.finalType === SimulationObjectType.Activity),
            connectors: autoMappedItems.filter(m => m.finalType === SimulationObjectType.Connector),
            skipped: autoMappedItems.filter(m => m.finalType === null)
        };
    }, [autoMappedItems]);

    /**
     * Set an override for an element's type
     */
    const setOverride = useCallback((elementId: string, targetType: SimulationObjectType | null) => {
        dispatch({
            type: 'CONVERSION_PREVIEW_OVERRIDE',
            elementId,
            targetType
        });
    }, [dispatch]);

    /**
     * Toggle the auto-mapped details section
     */
    const toggleDetails = useCallback(() => {
        dispatch({ type: 'CONVERSION_PREVIEW_TOGGLE_DETAILS' });
    }, [dispatch]);

    /**
     * Set the currently editing item ID (for override panel)
     */
    const setEditingItem = useCallback((elementId: string | null) => {
        dispatch({
            type: 'CONVERSION_PREVIEW_SET_EDITING',
            elementId
        });
    }, [dispatch]);

    /**
     * Apply the conversion with current overrides
     */
    const applyConversion = useCallback(() => {
        if (!state.previewData?.pageId) {
            console.error('Cannot apply conversion: no preview data');
            return;
        }

        // Build overrides array from userOverrides
        const overrides: ElementMappingOverride[] = Object.entries(state.userOverrides)
            .map(([elementId, targetType]) => ({
                elementId,
                targetType
            }));

        sender.applyConversion(state.previewData.pageId, overrides);
    }, [state.previewData?.pageId, state.userOverrides, sender]);

    /**
     * Check if there are any user overrides
     */
    const hasOverrides = useMemo(() => {
        return Object.keys(state.userOverrides).length > 0;
    }, [state.userOverrides]);

    /**
     * Get available types for an element based on its kind
     */
    const getAvailableTypes = useCallback((elementKind: DiagramElementKind): (SimulationObjectType | null)[] => {
        if (elementKind === DiagramElementKind.LINE) {
            // Lines can only be Connector or Skip
            return [SimulationObjectType.Connector, null];
        } else {
            // Blocks can be various types
            return [
                SimulationObjectType.Activity,
                SimulationObjectType.Generator,
                SimulationObjectType.Resource,
                SimulationObjectType.Entity,
                null // Skip
            ];
        }
    }, []);

    return {
        // State
        isVisible: state.isVisible,
        isLoading: state.isLoading,
        isApplying: state.isApplying,
        error: state.error,
        previewData: state.previewData,
        showDetails: state.showDetails,
        editingItemId: state.editingItemId,

        // Computed
        mergedMappings,
        dynamicSummary,
        hasOverrides,
        unmappedItems,
        autoMappedItems,
        groupedAutoMapped,

        // Actions
        openPreview: sender.openPreview,
        closePreview: sender.closePreview,
        requestPreview: sender.requestPreview,
        setOverride,
        applyConversion,
        applyDefaults: sender.applyDefaults,
        getAvailableTypes,
        toggleDetails,
        setEditingItem
    };
}
