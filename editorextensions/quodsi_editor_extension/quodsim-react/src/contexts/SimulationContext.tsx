import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import {
  MessageTypes,
  RunState,
  SimulationObjectType,
  ExtensionMessaging
} from "@quodsi/shared";
import { SimulationStatus } from "../types/SimulationStatus";
import { useSimulationStatus } from "../hooks/useSimulationStatus";

// Initial simulation status
export const initialSimulationStatus: SimulationStatus = {
  pageStatus: null,
  isPollingSimState: false,
  errorMessage: null,
  lastChecked: null,
  newResultsAvailable: false,
} as const;

// Simulation state interface
interface SimulationState {
  simulationStatus: SimulationStatus;
  documentId: string | null;
}

// Initial state
const initialState: SimulationState = {
  simulationStatus: initialSimulationStatus,
  documentId: null
};

// Action types
type SimulationAction =
  | { type: "SET_SIMULATION_STATUS"; payload: SimulationStatus }
  | { type: "SET_DOCUMENT_ID"; payload: string | null }
  | { type: "SET_NEW_RESULTS"; payload: boolean }
  | { type: "START_SIMULATION"; payload?: string }
  | { type: "SIMULATION_COMPLETED" }
  | { type: "SIMULATION_ERROR"; payload: string }
  | { type: "ACKNOWLEDGE_RESULTS" };

// Context interface
interface SimulationContextValue {
  state: SimulationState;
  dispatch: React.Dispatch<SimulationAction>;
  // Helper functions
  startSimulation: (scenarioName?: string) => void;
  viewResults: () => void;
  acknowledgeResults: () => void;
  setDocumentId: (documentId: string | null) => void;
}

// Create the context
export const SimulationContext = createContext<SimulationContextValue | undefined>(undefined);

// Reducer function
function simulationReducer(
  state: SimulationState,
  action: SimulationAction
): SimulationState {
  switch (action.type) {
    case "SET_SIMULATION_STATUS":
      return {
        ...state,
        simulationStatus: action.payload
      };
      
    case "SET_DOCUMENT_ID":
      return {
        ...state,
        documentId: action.payload
      };
      
    case "SET_NEW_RESULTS":
      return {
        ...state,
        simulationStatus: {
          ...state.simulationStatus,
          newResultsAvailable: action.payload
        }
      };
      
    case "START_SIMULATION": {
      const scenarioName = action.payload || "Base Scenario";
      return {
        ...state,
        simulationStatus: {
          ...state.simulationStatus,
          pageStatus: {
            ...(state.simulationStatus.pageStatus || {}),
            hasContainer: true,
            scenarios: [
              {
                id: "00000000-0000-0000-0000-000000000000",
                name: scenarioName,
                reps: 1,
                forecastDays: 30,
                runState: RunState.Running,
                type: SimulationObjectType.Scenario
              }
            ],
            statusDateTime: new Date().toISOString()
          },
          isPollingSimState: true
        }
      };
    }
    
    case "SIMULATION_COMPLETED":
      return {
        ...state,
        simulationStatus: {
          ...state.simulationStatus,
          isPollingSimState: false
        }
      };
      
    case "SIMULATION_ERROR":
      return {
        ...state,
        simulationStatus: {
          ...state.simulationStatus,
          errorMessage: action.payload,
          isPollingSimState: false
        }
      };
      
    case "ACKNOWLEDGE_RESULTS":
      return {
        ...state,
        simulationStatus: {
          ...state.simulationStatus,
          newResultsAvailable: false
        }
      };
      
    default:
      return state;
  }
}

// Provider component
export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [state, dispatch] = useReducer(simulationReducer, initialState);
  const messaging = ExtensionMessaging.getInstance();
  
  // Use the simulation status hook if we have a document ID
  const { newResultsAvailable, acknowledgeResults: ackResults } = useSimulationStatus(
    state.documentId || "",
    30 // Poll every 30 seconds
  );
  
  // Update state when newResultsAvailable changes
  useEffect(() => {
    if (newResultsAvailable !== state.simulationStatus.newResultsAvailable) {
      console.log("[SimulationContext] New results available changed:", newResultsAvailable);
      dispatch({ type: "SET_NEW_RESULTS", payload: newResultsAvailable });
    }
  }, [newResultsAvailable, state.simulationStatus.newResultsAvailable]);
  
  // Set document ID
  const setDocumentId = useCallback((documentId: string | null) => {
    console.log("[SimulationContext] Setting document ID:", documentId);
    dispatch({ type: "SET_DOCUMENT_ID", payload: documentId });
  }, []);
  
  // Start a simulation
  const startSimulation = useCallback((scenarioName?: string) => {
    console.log("[SimulationContext] Starting simulation", { scenarioName });
    
    try {
      // Send message to LucidChart
      messaging.sendMessage(MessageTypes.SIMULATE_MODEL, { scenarioName });
      
      // Update local state
      dispatch({ type: "START_SIMULATION", payload: scenarioName });
    } catch (error) {
      console.error("[SimulationContext] Failed to start simulation:", error);
      dispatch({
        type: "SIMULATION_ERROR",
        payload: `Failed to start simulation: ${error}`
      });
    }
  }, [messaging]);
  
  // View simulation results
  const viewResults = useCallback(() => {
    console.log("[SimulationContext] Viewing results");
    
    if (state.documentId) {
      try {
        // Send message to open dashboard
        messaging.sendMessage(MessageTypes.VIEW_SIMULATION_RESULTS, {
          documentId: state.documentId
        });
        
        // Acknowledge results on the server
        ackResults();
        
        // Update local state
        dispatch({ type: "ACKNOWLEDGE_RESULTS" });
      } catch (error) {
        console.error("[SimulationContext] Failed to view results:", error);
      }
    } else {
      console.error("[SimulationContext] Cannot view results: No document ID");
    }
  }, [messaging, state.documentId, ackResults]);
  
  // Acknowledge results wrapper
  const acknowledgeResults = useCallback(() => {
    console.log("[SimulationContext] Acknowledging results");
    ackResults();
    dispatch({ type: "ACKNOWLEDGE_RESULTS" });
  }, [ackResults]);
  
  // Combine state, dispatch and helper functions
  const contextValue: SimulationContextValue = {
    state,
    dispatch,
    startSimulation,
    viewResults,
    acknowledgeResults,
    setDocumentId
  };
  
  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  );
};

// Custom hook to use the simulation context
export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
};
