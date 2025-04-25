import React, { useState, useEffect, useCallback } from "react";
import {
  MessageTypes,
  MessagePayloads,
  ModelStructure,
  ValidationState,
  SimulationObjectType,
  EditorReferenceData,
  ExtensionMessaging,
  isValidMessage,
  ModelItemData,
  DiagramElementType,
  RunState,
  ActionType,
} from "@quodsi/shared";

import { ModelPanelAccordion } from "./components/ModelPanelAccordion/ModelPanelAccordion";
import { ErrorDisplay } from "./components/ui/ErrorDisplay";
import { ProcessingIndicator } from "./components/ui/ProcessingIndicator";
import {
  MessageHandler,
  messageHandlers,
  registerHandler,
} from "./services/messageHandlers/messageHandlers";
import { useSimulationStatus } from "./hooks/useSimulationStatus";
import { SimulationStatus } from "./types/SimulationStatus";
import { useAuth } from "./auth/AuthProvider";
import { AuthPanel } from "./components/auth/AuthPanel";
import { useMsal } from "@azure/msal-react";

export interface AppState {
  // Existing properties
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  lastElementUpdate: string | null;
  isProcessing: boolean;
  error: string | null;
  documentId: string | null;
  diagramElementType?: DiagramElementType;
  referenceData: EditorReferenceData;
  isReady: boolean;
  showModelName: boolean;
  showModelItemName: boolean;
  visibleSections: {
    header: boolean;
    validation: boolean;
    editor: boolean;
    modelTree: boolean;
  };
  simulationStatus: SimulationStatus;

  // Panel type - determines which panel is shown
  panelType: "auth" | "model" | null;
}

export const initialSimulationStatus: SimulationStatus = {
  pageStatus: null,
  isPollingSimState: false,
  errorMessage: null,
  lastChecked: null,
  newResultsAvailable: false,
} as const;

const initialState: AppState = {
  modelName: "New Model",
  validationState: null,
  currentElement: null,
  lastElementUpdate: null,
  isProcessing: false,
  error: null,
  documentId: null,
  referenceData: {
    entities: [],
    resources: [],
  },
  isReady: false,
  showModelName: true,
  showModelItemName: true,
  visibleSections: {
    header: true,
    validation: false,
    editor: true,
    modelTree: false,
  },
  simulationStatus: initialSimulationStatus,
  // Set a default panelType based on URL - if it contains 'auth' in the URL path
  // If we can't determine it yet, default to null and wait for panel init message
  panelType: window.location.pathname.includes("auth") ? "auth" : null,
};

const QuodsiApp: React.FC = () => {
  console.log("[QuodsiApp] Component mounting");
  const [state, setState] = useState<AppState>(initialState);
  const messaging = ExtensionMessaging.getInstance();

  // Use the authentication hook from the AuthProvider context
  const { isAuthenticated, userInfo } = useAuth();
  const { inProgress } = useMsal();

  // Create a type-safe message sender that uses window.postMessage
  const sendMessage = useCallback(
    <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => {
      try {
        ExtensionMessaging.getInstance().sendMessage(type, payload);
      } catch (error) {
        console.error("[QuodsiApp] Failed to send message:", error);
        setState((prev) => ({
          ...prev,
          error: `Failed to communicate with LucidChart: ${error}`,
        }));
      }
    },
    []
  );

  // Handle redirect to auth panel
  const handleRedirectToAuthPanel = useCallback(() => {
    sendMessage(MessageTypes.AUTH);
  }, [sendMessage]);

  const documentId = state.documentId;

  // Use the hook and capture its return values
  const { newResultsAvailable, acknowledgeResults } = useSimulationStatus(
    documentId || "",
    30
  );

  // Update our state when newResultsAvailable changes
  useEffect(() => {
    console.log(
      "[QuodsiApp] newResultsAvailable changed:",
      newResultsAvailable
    );

    setState((prev) => ({
      ...prev,
      simulationStatus: {
        ...prev.simulationStatus,
        newResultsAvailable,
      },
    }));
  }, [newResultsAvailable]);

  useEffect(() => {
    console.log("[QuodsiApp] Component mounted");
    return () => console.log("[QuodsiApp] Component unmounted");
  }, []);

  console.log("[QuodsiApp] documentId", documentId);

  // Set up message handling
  useEffect(() => {
    console.log("[QuodsiApp] Setting up ExtensionMessaging");

    const deps = {
      setState,
      setError: (error: string | null) =>
        setState((prev) => ({ ...prev, error })),
      sendMessage,
    };

    // Register handlers in a type-safe way
    (
      Object.entries(messageHandlers) as [
        MessageTypes,
        MessageHandler<MessageTypes>
      ][]
    ).forEach(([type, handler]) => {
      registerHandler(messaging, type, handler, deps);
    });

    const handleWindowMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!isValidMessage(message)) {
        console.error("[QuodsiApp] Invalid message format:", message);
        return;
      }
      messaging.handleIncomingMessage(message);
    };

    window.addEventListener("message", handleWindowMessage);
    sendMessage(MessageTypes.REACT_APP_READY);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [messaging, sendMessage]);

  // Updated to use ACTION_REQUEST
  const handleElementTypeChange = useCallback(
    (elementId: string, newType: SimulationObjectType) => {
      console.log("[QuodsiApp] Type conversion requested:", {
        elementId,
        newType,
      });
      setState((prev) => ({ ...prev, isProcessing: true }));

      sendMessage(MessageTypes.ACTION_REQUEST, {
        actionType: ActionType.CONVERT_ELEMENT,
        data: {
          elementId,
          type: newType,
        },
      });
    },
    [sendMessage]
  );

  // Updated to use ACTION_REQUEST
  const handleValidate = useCallback(() => {
    console.log("[QuodsiApp] Validate requested");
    sendMessage(MessageTypes.ACTION_REQUEST, {
      actionType: ActionType.VALIDATE_MODEL,
    });
  }, [sendMessage]);

  // Updated to use ACTION_REQUEST
  const handleElementUpdate = useCallback(
    (elementId: string, data: any) => {
      console.log("[QuodsiApp] Update requested:", { elementId, data });
      setState((prev) => ({ ...prev, isProcessing: true }));

      // Handle type conversion
      if (data.type && Object.keys(data).length === 1) {
        sendMessage(MessageTypes.ACTION_REQUEST, {
          actionType: ActionType.UPDATE_ELEMENT_DATA,
          data: {
            elementId,
            type: data.type,
            data: {}, // Empty data for type conversion
          },
        });
      } else {
        // Regular update
        sendMessage(MessageTypes.ACTION_REQUEST, {
          actionType: ActionType.UPDATE_ELEMENT_DATA,
          data: {
            elementId,
            type:
              state.currentElement?.metadata?.type || SimulationObjectType.None,
            data: {
              ...data,
              id: elementId,
            },
          },
        });
      }
    },
    [sendMessage, state.currentElement?.metadata?.type]
  );

  // Updated to use ACTION_REQUEST
  const handleSimulate = useCallback(
    (scenarioName?: string) => {
      console.log("[QuodsiApp] Simulate requested", { scenarioName });
      sendMessage(MessageTypes.ACTION_REQUEST, {
        actionType: ActionType.SIMULATE_MODEL,
        data: {
          scenarioName,
        },
      });

      // Set the simulation button to running state
      setState((prev) => ({
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
    },
    [sendMessage]
  );

  // Updated to use ACTION_REQUEST
  const handleRemoveModel = useCallback(() => {
    console.log("[QuodsiApp] Remove model requested");
    sendMessage(MessageTypes.ACTION_REQUEST, {
      actionType: ActionType.REMOVE_MODEL,
    });
  }, [sendMessage]);

  // Already updated to use ACTION_REQUEST
  const handleConvertPage = useCallback(() => {
    console.log("[QuodsiApp] Convert page requested");
    sendMessage(MessageTypes.ACTION_REQUEST, {
      actionType: ActionType.CONVERT_PAGE,
    });
  }, [sendMessage]);

  // Updated to use ACTION_REQUEST
  const handleViewResults = useCallback(() => {
    console.log("[QuodsiApp] View results requested");

    if (documentId) {
      // Send the message to LucidChart to create the dashboard
      sendMessage(MessageTypes.ACTION_REQUEST, {
        actionType: ActionType.VIEW_SIMULATION_RESULTS,
        data: {
          documentId: documentId,
        },
      });

      // Also call acknowledgeResults to mark results as viewed on the server
      acknowledgeResults();

      // Just update the local state to remove the notification
      setState((prev) => ({
        ...prev,
        simulationStatus: {
          ...prev.simulationStatus,
          newResultsAvailable: false,
        },
      }));
    }
  }, [documentId, sendMessage, acknowledgeResults]);

  return (
    <div className="flex flex-col h-screen">
      {state.error && <ErrorDisplay error={state.error} />}

      {state.panelType === "auth" ? (
        // Show the Auth Panel when panelType is "auth"
        <AuthPanel />
      ) : // For ModelPanel, check if MSAL is initializing, then check auth status
      inProgress !== "none" ? (
        // Show loading while MSAL is initializing
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      ) : !isAuthenticated ? (
        // Not authenticated - show sign-in message
        <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-4">
              Please sign in to access the Quodsi simulation modeling tools.
            </p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={handleRedirectToAuthPanel}
            >
              Sign In
            </button>
          </div>
        </div>
      ) : (
        // Authenticated - show ModelPanelAccordion
        <ModelPanelAccordion
          modelName={state.modelName}
          validationState={state.validationState}
          currentElement={state.currentElement}
          lastElementUpdate={state.lastElementUpdate}
          diagramElementType={state.diagramElementType}
          onValidate={handleValidate}
          onElementUpdate={handleElementUpdate}
          referenceData={state.referenceData}
          showModelName={state.showModelName}
          showModelItemName={state.showModelItemName}
          visibleSections={state.visibleSections}
          onSimulate={handleSimulate}
          onRemoveModel={handleRemoveModel}
          onConvertPage={handleConvertPage}
          onElementTypeChange={handleElementTypeChange}
          simulationStatus={state.simulationStatus}
          onViewResults={handleViewResults}
        />
      )}
    </div>
  );
};

export default QuodsiApp;
