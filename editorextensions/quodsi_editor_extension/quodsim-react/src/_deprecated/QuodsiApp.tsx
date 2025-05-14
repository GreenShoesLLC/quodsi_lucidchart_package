import React, { useState, useEffect, useCallback } from "react";
import {
  ValidationState,
  SimulationObjectType,
  EditorReferenceData,
  DiagramElementType,
  RunState,
} from "@quodsi/shared";

import { ErrorDisplay } from "./ErrorDisplay";
import { ProcessingIndicator } from "./ProcessingIndicator";
import {
  MessageHandler,
  messageHandlers,
  registerHandler,
} from "./messageHandlers";
import { useSimulationStatus } from "./useSimulationStatus";
import { SimulationStatus } from "../types/SimulationStatus";
import { useAuth } from "./AuthProvider";
import { AuthPanel } from "./AuthPanel";
import { useMsal } from "@azure/msal-react";
import { ModelPanelAccordion } from "./ModelPanelAccordion/ModelPanelAccordion";
import {
  ActionType,
  ExtensionMessaging,
  isValidMessage,
  MessagePayloads,
  MessageTypes,
  ModelItemData,
} from "@quodsi/shared/src/types";

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

  // Flag to track whether the model needs initialization
  needsInitialization: boolean;
}

export const initialSimulationStatus: SimulationStatus = {
  pageStatus: null,
  isPollingSimState: false,
  errorMessage: null,
  lastChecked: null,
  newResultsAvailable: false,
} as const;

const initialState: AppState = {
  modelName: "", // Empty model name to avoid showing "New Model"
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
  // Flag to track whether the model needs initialization
  needsInitialization: false,
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

    // Set isReady to true after a short delay when component mounts
    // This ensures we won't show loading indefinitely if something goes wrong with messaging
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isReady: true,
      }));
      console.log("[QuodsiApp] Forced isReady=true after timeout");
    }, 2000);

    return () => {
      clearTimeout(timer);
      console.log("[QuodsiApp] Component unmounted");
    };
  }, []);

  console.log("[QuodsiApp] documentId", documentId);

  // This is the fixed version for QuodsiApp.tsx

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

    // Create the authentication data to include with REACT_APP_READY
    // Make sure the types exactly match AuthData
    const authData = {
      panelType: state.panelType || undefined, // Convert null to undefined to match the type
      isAuthenticated: isAuthenticated,
      userInfo: userInfo || undefined,
    };

    console.log("[QuodsiApp] Sending REACT_APP_READY with auth data:", {
      panelType: state.panelType || undefined,
      isAuthenticated: isAuthenticated,
      hasUserInfo: !!userInfo,
    });

    // Send the REACT_APP_READY message with auth data
    sendMessage(MessageTypes.REACT_APP_READY, authData);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [messaging, sendMessage, isAuthenticated, userInfo, state.panelType]);

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
      // Detailed initial logging
      console.group("[QuodsiApp] Element Update Request");
      console.log("Element ID:", elementId);
      console.log("Incoming Data:", JSON.parse(JSON.stringify(data))); // Deep log without circular references
      console.log(
        "Current Element Type:",
        state.currentElement?.metadata?.type
      );

      // Set processing state
      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        // Type conversion scenario
        if (data.type && Object.keys(data).length === 1) {
          console.log("Detected Type Conversion Request");
          sendMessage(MessageTypes.ACTION_REQUEST, {
            actionType: ActionType.UPDATE_ELEMENT_DATA,
            data: {
              elementId,
              type: data.type,
              data: {}, // Empty data for type conversion
            },
          });
          console.log("Sent Type Conversion Message");
        } else {
          // Regular update scenario
          console.log("Detected Regular Element Update");
          sendMessage(MessageTypes.ACTION_REQUEST, {
            actionType: ActionType.UPDATE_ELEMENT_DATA,
            data: {
              elementId,
              type:
                state.currentElement?.metadata?.type ||
                SimulationObjectType.None,
              data: {
                ...data,
                id: elementId,
              },
            },
          });
          console.log("Sent Regular Update Message");
        }
      } catch (error) {
        console.error("[QuodsiApp] Element Update Error:", error);
        setState((prev) => ({ ...prev, isProcessing: false }));
      } finally {
        console.groupEnd();
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

  // Add a new loading state to track initialization
  const [isLoading, setIsLoading] = useState(true);

  // Safety timeout to force hide loading if it's stuck
  useEffect(() => {
    if (isLoading) {
      const safetyTimer = setTimeout(() => {
        console.log(
          "[QuodsiApp] Safety timeout reached - forcing loading to false"
        );
        setIsLoading(false);
      }, 5000); // 5 seconds max loading time

      return () => clearTimeout(safetyTimer);
    }
  }, [isLoading]);

  // Effect to try to detect panel type from URL parameters
  useEffect(() => {
    // Only run if panelType is not set yet
    if (!state.panelType) {
      try {
        // Try to determine panel type from URL search params
        const urlParams = new URLSearchParams(window.location.search);
        const panelParam = urlParams.get("panel");

        if (panelParam) {
          // If panel parameter exists, use it
          const detectedType =
            panelParam.toLowerCase() === "auth" ? "auth" : "model";
          console.log(
            `[QuodsiApp] Detected panel type '${detectedType}' from URL parameter`
          );

          setState((prev) => ({
            ...prev,
            panelType: detectedType,
          }));
        } else if (window.location.pathname.includes("auth")) {
          // Fallback to checking URL path
          console.log("[QuodsiApp] Detected auth panel from URL path");
          setState((prev) => ({
            ...prev,
            panelType: "auth",
          }));
        } else {
          // Default to model panel if we can't determine
          console.log("[QuodsiApp] Defaulting to model panel");
          setState((prev) => ({
            ...prev,
            panelType: "model",
          }));
        }
      } catch (error) {
        console.error("[QuodsiApp] Error detecting panel type:", error);
      }
    }
  }, []); // Only run once on mount

  // Add an effect to hide loading after app is ready and data arrives
  useEffect(() => {
    console.log("[QuodsiApp] Panel type or auth state changed:", {
      panelType: state.panelType,
      inProgress,
      isAuthenticated,
      isReady: state.isReady,
    });

    // Hide loading in these cases:
    // 1. We have a panelType and authentication is ready
    // 2. We definitely know we're in auth panel
    // 3. We've received any message from the extension (REACT_APP_READY has been processed)
    // 4. As a fallback, it's been more than 2 seconds since mounting (covered by isReady)
    if (
      (state.panelType && inProgress === "none") ||
      state.panelType === "auth" ||
      state.isReady
    ) {
      console.log("[QuodsiApp] Conditions met to hide loading screen");
      const timer = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(timer);
    }
  }, [state.panelType, inProgress, isAuthenticated, state.isReady]);

  return (
    <div className="flex flex-col h-screen">
      {state.error && <ErrorDisplay error={state.error} />}

      {isLoading ? (
        // Show a loading spinner while initializing
        <ProcessingIndicator
          message="Initializing Quodsi..."
          fullScreen={true}
        />
      ) : state.panelType === "auth" ? (
        // Show the Auth Panel when panelType is "auth"
        <AuthPanel />
      ) : // For ModelPanel, check if MSAL is initializing, then check auth status
      inProgress !== "none" ? (
        // Show loading while MSAL is initializing
        <ProcessingIndicator
          message="Initializing authentication..."
          fullScreen={true}
        />
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
        // Authenticated - show ModelPanelAccordion with processing indicator when needed
        <>
          {state.isProcessing && (
            <div className="absolute top-0 left-0 right-0 z-10">
              <ProcessingIndicator message="Processing..." />
            </div>
          )}
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
            needsInitialization={state.needsInitialization}
          />
        </>
      )}
    </div>
  );
};

export default QuodsiApp;
