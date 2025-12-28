import { useEffect, useMemo, useState } from 'react';
import { useSimulation } from '../MessageProvider';
import { useSimulationSender } from '../senders/simulationSender';
import { SimulationStatus } from '@quodsi/shared';

/**
 * Enhanced hook for simulation state that combines state, computed properties,
 * and actions for running and managing simulations
 * 
 * @param pollingInterval Optional polling interval in milliseconds for auto-updates
 * @returns Simulation state and simulation-related actions
 */
export function useSimulationState(pollingInterval?: number) {
  const simulation = useSimulation();
  const { requestSimulation, viewResults } = useSimulationSender();
  
  // Local state for polling controls - now managed by the hook itself, not state
  const [isPolling, setIsPolling] = useState(false);
  
  // Setup polling effect if needed
  useEffect(() => {
    if (!isPolling || !simulation.jobId || !pollingInterval) return;
    
    // If a simulation is running, poll for updates
    if (
      simulation.status === SimulationStatus.QUEUED ||
      simulation.status === SimulationStatus.PROCESSING ||
      simulation.status === SimulationStatus.RUNNING ||
      simulation.status === SimulationStatus.VALIDATING
    ) {
      const intervalId = window.setInterval(() => {
        // Poll for updates - this would typically involve sending a message
        // to request the current simulation status
        console.log('Polling for simulation updates...');
        
        // For now, we don't have a specific "poll" message in the protocol
        // This would be added to the simulationSender if needed
      }, pollingInterval);
      
      return () => window.clearInterval(intervalId);
    } else {
      // If simulation is in a terminal state, stop polling
      setIsPolling(false);
    }
  }, [isPolling, simulation.jobId, simulation.status, pollingInterval]);
  
  // Extract results data safely
  const results = useMemo(() => {
    if (!simulation.results) return null;
    
    // Extract relevant fields from results if they exist
    // This is a safe fallback - replace with actual structure as needed
    return {
      resultUrl: simulation.results.url || '',
      currentStep: simulation.results.currentStep || 0,
      // Add other result fields as needed
    };
  }, [simulation.results]);
  
  // Combine state and actions into a single object
  const simulationState = useMemo(() => ({
    // State
    status: simulation.status,
    progress: simulation.progress || 0,
    jobId: simulation.jobId,
    currentStep: results?.currentStep || 0,
    error: simulation.error,
    resultUrl: results?.resultUrl || '',
    isPolling,
    startedAt: simulation.startedAt,
    completedAt: simulation.completedAt,
    lastUpdated: simulation.lastUpdated,
    
    // Computed properties
    isRunning: (
      simulation.status === SimulationStatus.RUNNING || 
      simulation.status === SimulationStatus.PROCESSING ||
      simulation.status === SimulationStatus.VALIDATING ||
      simulation.status === SimulationStatus.QUEUED
    ),
    isComplete: simulation.status === SimulationStatus.COMPLETED,
    isFailed: simulation.status === SimulationStatus.ERROR, // Using ERROR from our local enum
    isCancelled: simulation.status === SimulationStatus.CANCELLED,
    
    // Progress helpers
    progressPercent: Math.max(0, Math.min(100, simulation.progress || 0)),
    
    // Actions
    runSimulation: (
      documentId: string, 
      scenarioName?: string,
      durationDays?: number,
      repetitions?: number
    ) => {
      requestSimulation(documentId, scenarioName, durationDays, repetitions);
      setIsPolling(true);
    },
    viewResults: (documentId: string, jobId?: string) => {
      viewResults(documentId, jobId);
    },
    startPolling: () => setIsPolling(true),
    stopPolling: () => setIsPolling(false)
  }), [
    simulation.status,
    simulation.progress,
    simulation.jobId,
    simulation.error,
    simulation.startedAt,
    simulation.completedAt,
    simulation.lastUpdated,
    results,
    isPolling,
    requestSimulation,
    viewResults
  ]);
  
  return simulationState;
}
