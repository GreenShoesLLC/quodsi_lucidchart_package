// src/services/actions/actionHandlers.ts
import {
  MessageTypes,
  ActionType,
  SimulationObjectType,
  RunState,
  ComponentLogger
} from "@quodsi/shared";
import { getMessageService } from "./messageService";
import { AppState } from "./QuodsiApp";
import { sendActionRequest } from "./actionRequestHandlers";

// Define a constant for the logger prefix
const LOG_PREFIX = '[ActionHandlers]';

export class ActionHandlers {
  private setState: React.Dispatch<React.SetStateAction<AppState>>;
  private getState: () => AppState;
  private messageService: ReturnType<typeof getMessageService>;
  private deps: any; // Dependencies for message handlers

  constructor(
    setState: React.Dispatch<React.SetStateAction<AppState>>,
    getState: () => AppState
  ) {
    this.setState = setState;
    this.getState = getState;
    this.messageService = getMessageService();

    // Initialize logging to be disabled by default
    this.setLogging(false);

    // Create dependencies object that will be passed to message handlers
    this.deps = {
      setState: this.setState,
      setError: (error: string | null) =>
        this.setState((prev) => ({ ...prev, error })),
      sendMessage: (type: MessageTypes, payload: any) =>
        this.messageService.sendMessage(type, payload, this.setState)
    };
  }

  /**
   * Enable or disable logging for this service
   */
  public setLogging(enabled: boolean): void {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
  }

  /**
   * Handler for element type change
   */
  public handleElementTypeChange = (elementId: string, newType: SimulationObjectType) => {
    ComponentLogger.log(LOG_PREFIX, "Type conversion requested:", {
      elementId,
      newType,
    });
    this.setState((prev) => ({ ...prev, isProcessing: true }));

    // Use the existing sendActionRequest helper
    sendActionRequest(this.deps, ActionType.CONVERT_ELEMENT, {
      elementId,
      type: newType,
    });
  };

  /**
   * Handler for model validation
   */
  public handleValidate = () => {
    ComponentLogger.log(LOG_PREFIX, "Validate requested");
    sendActionRequest(this.deps, ActionType.VALIDATE_MODEL);
  };

  /**
   * Handler for element updates
   */
  public handleElementUpdate = (elementId: string, data: any) => {
    // Get current state
    const state = this.getState();

    // Detailed initial logging
    ComponentLogger.group(LOG_PREFIX, "Element Update Request");
    ComponentLogger.log(LOG_PREFIX, "Element ID:", elementId);
    ComponentLogger.log(LOG_PREFIX, "Incoming Data:", JSON.parse(JSON.stringify(data))); // Deep log without circular references
    ComponentLogger.log(
      LOG_PREFIX,
      "Current Element Type:",
      state.currentElement?.metadata?.type
    );

    // Set processing state
    this.setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      // Type conversion scenario
      if (data.type && Object.keys(data).length === 1) {
        ComponentLogger.log(LOG_PREFIX, "Detected Type Conversion Request");
        sendActionRequest(this.deps, ActionType.UPDATE_ELEMENT_DATA, {
          elementId,
          type: data.type,
          data: {}, // Empty data for type conversion
        });
        ComponentLogger.log(LOG_PREFIX, "Sent Type Conversion Message");
      } else {
        // Regular update scenario
        ComponentLogger.log(LOG_PREFIX, "Detected Regular Element Update");
        sendActionRequest(this.deps, ActionType.UPDATE_ELEMENT_DATA, {
          elementId,
          type:
            state.currentElement?.metadata?.type ||
            SimulationObjectType.None,
          data: {
            ...data,
            id: elementId,
          },
        });
        ComponentLogger.log(LOG_PREFIX, "Sent Regular Update Message");
      }
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, "Element Update Error:", error);
      this.setState((prev) => ({ ...prev, isProcessing: false }));
    } finally {
      ComponentLogger.groupEnd(LOG_PREFIX);
    }
  };

  /**
   * Handler for simulation
   */
  public handleSimulate = (scenarioName?: string) => {
    ComponentLogger.log(LOG_PREFIX, "Simulate requested", { scenarioName });
    sendActionRequest(this.deps, ActionType.SIMULATE_MODEL, {
      scenarioName,
    });

    // Note: UI state updates will also be handled by the actionRequestHandler
    // But we'll do it here too for immediate feedback
    this.setState((prev) => ({
      ...prev,
      simulationStatus: {
        ...prev.simulationStatus,
        pageStatus: {
          ...(prev.simulationStatus.pageStatus || {}),
          hasContainer: true,
          scenarios: [
            {
              id: "00000000-0000-0000-0000-000000000000",
              name: scenarioName || "Base Scenario",
              reps: 1,
              forecastDays: 30,
              runState: RunState.Running,
              type: SimulationObjectType.Scenario,
            },
          ],
          statusDateTime: new Date().toISOString(),
        },
        isPollingSimState: true,
      },
    }));
  };

  /**
   * Handler for removing model
   */
  public handleRemoveModel = () => {
    ComponentLogger.log(LOG_PREFIX, "Remove model requested");
    sendActionRequest(this.deps, ActionType.REMOVE_MODEL);
  };

  /**
   * Handler for converting page
   */
  public handleConvertPage = () => {
    ComponentLogger.log(LOG_PREFIX, "Convert page requested");
    sendActionRequest(this.deps, ActionType.CONVERT_PAGE);
  };

  /**
   * Handler for viewing results
   */
  public handleViewResults = (acknowledgeResults: () => void) => {
    ComponentLogger.log(LOG_PREFIX, "View results requested");

    // Get current state
    const state = this.getState();

    if (state.documentId) {
      // Send the message to LucidChart to create the dashboard
      sendActionRequest(this.deps, ActionType.VIEW_SIMULATION_RESULTS, {
        documentId: state.documentId,
      });

      // Also call acknowledgeResults to mark results as viewed on the server
      acknowledgeResults();

      // Also send specific action to mark results as viewed
      sendActionRequest(this.deps, ActionType.MARK_RESULTS_VIEWED, {
        documentId: state.documentId,
      });

      // Just update the local state to remove the notification
      this.setState((prev) => ({
        ...prev,
        simulationStatus: {
          ...prev.simulationStatus,
          newResultsAvailable: false,
        },
      }));
    }
  };

  /**
   * Handler for redirect to auth panel
   */
  public handleRedirectToAuthPanel = () => {
    this.messageService.sendMessage(MessageTypes.AUTH, undefined, this.setState);
  };
}

/**
 * Helper function to create ActionHandlers instance
 */
export const createActionHandlers = (
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  getState: () => AppState
): ActionHandlers => {
  return new ActionHandlers(setState, getState);
};