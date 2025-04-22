import { useCallback } from 'react';
import { MessageTypes } from '@quodsi/shared';
import { ExtensionMessaging } from '@quodsi/shared';

/**
 * Custom hook for simulation operations that works independently from the Simulation context
 * This version doesn't depend on contexts and can be used before refactoring is complete
 */
export function useSimulationOperations() {
  const messaging = ExtensionMessaging.getInstance();
  
  // Start a simulation
  const startSimulation = useCallback((scenarioName?: string) => {
    try {
      console.log("[useSimulationOperations] Starting simulation:", scenarioName);
      messaging.sendMessage(MessageTypes.SIMULATE_MODEL, { scenarioName });
    } catch (error) {
      console.error("[useSimulationOperations] Failed to start simulation:", error);
    }
  }, [messaging]);
  
  // View simulation results
  const viewResults = useCallback((documentId: string) => {
    try {
      console.log("[useSimulationOperations] Viewing results for document:", documentId);
      
      if (documentId) {
        messaging.sendMessage(MessageTypes.VIEW_SIMULATION_RESULTS, {
          documentId: documentId
        });
      } else {
        console.error("[useSimulationOperations] Cannot view results: No document ID");
      }
    } catch (error) {
      console.error("[useSimulationOperations] Failed to view results:", error);
    }
  }, [messaging]);
  
  // Return all simulation operations
  return {
    startSimulation,
    viewResults
  };
}
