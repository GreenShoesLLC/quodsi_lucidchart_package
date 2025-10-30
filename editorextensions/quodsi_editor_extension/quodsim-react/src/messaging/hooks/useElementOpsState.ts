import { useMemo } from 'react';
import { useElementOps } from '../MessageContext';

/**
 * Enhanced hook for element operations state that provides
 * helper functions and computed properties for managing save state
 *
 * @returns Element operations state and helper functions
 */
export function useElementOpsState() {
  const elementOps = useElementOps();

  // Create helper functions and computed properties
  const elementOpsState = useMemo(() => ({
    // Raw state
    savingElements: elementOps.savingElements,
    saveErrors: elementOps.saveErrors,
    lastSaveTimestamp: elementOps.lastSaveTimestamp,
    optimisticData: elementOps.optimisticData,
    lastUpdated: elementOps.lastUpdated,

    // Helper functions

    /**
     * Check if a specific element is currently being saved
     */
    isSaving: (elementId: string): boolean => {
      return elementOps.savingElements.has(elementId);
    },

    /**
     * Get save error message for a specific element
     */
    getSaveError: (elementId: string): string | undefined => {
      return elementOps.saveErrors[elementId];
    },

    /**
     * Check if a specific element has a save error
     */
    hasSaveError: (elementId: string): boolean => {
      return !!elementOps.saveErrors[elementId];
    },

    /**
     * Get optimistic data for a specific element
     */
    getOptimisticData: (elementId: string): any | undefined => {
      return elementOps.optimisticData[elementId];
    },

    /**
     * Check if a specific element has optimistic data
     */
    hasOptimisticData: (elementId: string): boolean => {
      return elementId in elementOps.optimisticData;
    },

    /**
     * Get the timestamp of the last successful save for an element
     */
    getLastSaveTimestamp: (elementId: string): number | undefined => {
      return elementOps.lastSaveTimestamp[elementId];
    },

    /**
     * Check if any element is currently being saved
     */
    isAnySaving: (): boolean => {
      return elementOps.savingElements.size > 0;
    },

    /**
     * Get count of elements currently being saved
     */
    getSavingCount: (): number => {
      return elementOps.savingElements.size;
    },

    /**
     * Get all element IDs currently being saved
     */
    getSavingElementIds: (): string[] => {
      return Array.from(elementOps.savingElements);
    },
  }), [
    elementOps.savingElements,
    elementOps.saveErrors,
    elementOps.lastSaveTimestamp,
    elementOps.optimisticData,
    elementOps.lastUpdated,
  ]);

  return elementOpsState;
}
