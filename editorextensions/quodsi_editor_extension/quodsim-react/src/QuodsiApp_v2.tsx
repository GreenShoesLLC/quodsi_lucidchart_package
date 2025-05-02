import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageTypes,
  MessagePayloads,
  ValidationState,
  SimulationObjectType,
  EditorReferenceData,
  isValidMessage,
  ModelItemData,
  DiagramElementType,
  RunState,
  AuthActionType,
} from "@quodsi/shared";

import { ModelPanelAccordion } from "./components/ModelPanelAccordion/ModelPanelAccordion";
import { ErrorDisplay } from "./components/ui/ErrorDisplay";
import { ProcessingIndicator } from "./components/ui/ProcessingIndicator";
import { useSimulationStatus } from "./hooks/useSimulationStatus";
import { SimulationStatus } from "./types/SimulationStatus";
import { useAuth } from "./auth/AuthProvider";
import { AuthPanel } from "./components/auth/AuthPanel";
import { useMsal } from "@azure/msal-react";

// Import the new services
import { getMessageService } from "./services/messaging/messageService";
import { createActionHandlers } from "./services/actions/actionHandlers";

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
  modelName: "",  // Empty model name to avoid showing "New Model"
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
  console.log("[QuodsiApp_v2] Component mounting");
  const [state, setState] = useState<AppState>(initialState);
  const [userIsAuthenticated, setUserIsAuthenticated] =
    useState<boolean>(false);

  const [localUserInfo, setLocalUserInfo] = useState<any>(null);
  // Add a new loading state to track initialization
  const [isLoading, setIsLoading] = useState(true);
  // Use the authentication hook from the AuthProvider context
  const { isAuthenticated, userInfo } = useAuth();
  const { inProgress } = useMsal();

  // Add a ref to get current state value for action handlers
  const stateRef = useRef<AppState>(state);

  // Sync the auth context state to local state
  useEffect(() => {
    if (isAuthenticated && userInfo) {
      console.log(
        "[QuodsiApp_v2] Auth context updated to authenticated, syncing local state"
      );
      setUserIsAuthenticated(true);
      setLocalUserInfo(userInfo);
    }
  }, [isAuthenticated, userInfo]);

  // Add an effect to handle auth updates from messaging
  useEffect(() => {
    // Create a handler for AUTH messages to directly update local state
    const handleAuthMessage = (message: any) => {
      // Only process messages from our messaging library
      if (!message || !message.data || !message.data.messagetype) {
        return;
      }

      // Check for AUTH message with status response
      if (
        message.data.messagetype === "AUTH" &&
        message.data.data?.type === "status_response" &&
        message.data.data?.data?.isAuthenticated
      ) {
        console.log(
          "[QuodsiApp_v2] Received direct AUTH update:",
          message.data.data.data
        );

        // Update local state directly
        setUserIsAuthenticated(true);
        setLocalUserInfo(message.data.data.data.userInfo || null);
      }
    };

    // Listen for messages
    window.addEventListener("message", handleAuthMessage);

    // Clean up
    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, []);


  console.log("[QuodsiApp_v2] Current auth state:", {
    isAuthenticated,
    userInfo,
    userIsAuthenticated
  });
  useEffect(() => {
    console.log("[QuodsiApp_v2] Auth state changed:", {
      isAuthenticated,
      userInfo,
      userIsAuthenticated
    });
  }, [isAuthenticated, userInfo, userIsAuthenticated]);
  // Update the ref when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Function to get current state for action handlers
  const getState = useCallback(() => stateRef.current, []);

  // Get message service instance
  const messageService = useRef(getMessageService());

  // Initialize action handlers
  const actionHandlers = useRef(createActionHandlers(setState, getState));

  // Create a type-safe message sender function (for dependencies)
  const sendMessage = useCallback(
    <T extends MessageTypes>(type: T, payload?: any) => {
      messageService.current.sendMessage(type, payload, setState);
    },
    []
  );

  const documentId = state.documentId;

  // Use the hook and capture its return values
  const { newResultsAvailable, acknowledgeResults } = useSimulationStatus(
    documentId || "",
    30
  );

  // Handle authentication errors
  useEffect(() => {
    if (
      inProgress === "startup" ||
      inProgress === "acquireToken" ||
      inProgress === "handleRedirect" ||
      inProgress === "ssoSilent"
    ) {
      console.log(
        "[QuodsiApp_v2] MSAL authentication in progress:",
        inProgress
      );
    } else if (
      inProgress === "none" &&
      !isAuthenticated &&
      state.panelType === "model"
    ) {
      console.log(
        "[QuodsiApp_v2] Authentication required but not authenticated"
      );
    }
  }, [inProgress, isAuthenticated, state.panelType]);

  // Update our state when newResultsAvailable changes
  useEffect(() => {
    console.log(
      "[QuodsiApp_v2] newResultsAvailable changed:",
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

  // Set up message handling
  useEffect(() => {
    console.log("[QuodsiApp_v2] Setting up ExtensionMessaging");

    // Create the dependencies object for message handlers
    const messageDeps = {
      setState,
      setError: (error: string | null) =>
        setState((prev) => ({ ...prev, error })),
      sendMessage,
    };

    // Initialize message handling with dependencies
    const cleanup = messageService.current.initMessageHandling(messageDeps);

    // Create the authentication data to include with REACT_APP_READY
    const authData = {
      panelType: state.panelType || undefined, // Convert null to undefined to match the type
      isAuthenticated: isAuthenticated,
      userInfo: userInfo || undefined,
    };

    // Send the REACT_APP_READY message with auth data
    messageService.current.sendAppReadyMessage(authData);

    // Set up action handlers with refreshed dependencies
    // This ensures they have access to the latest message service
    actionHandlers.current = createActionHandlers(setState, getState);

    // Return cleanup function
    return cleanup;
  }, [sendMessage, isAuthenticated, userInfo, state.panelType, getState]);

  // Add this useEffect back to QuodsiApp_v2.tsx to properly handle loading state transitions
  // Add it right after the other useEffects

  // Add an effect to hide loading after app is ready and data arrives
  useEffect(() => {
    console.log("[QuodsiApp_v2] Panel type or auth state changed:", {
      panelType: state.panelType,
      inProgress,
      isAuthenticated,
    });

    // Hide loading in these cases:
    // 1. We have a panelType and authentication is ready (inProgress is none)
    // 2. We definitely know we're in auth panel
    // 3. We've received any selection message
    if (
      (state.panelType && inProgress === "none") ||
      state.panelType === "auth" ||
      state.currentElement !== null ||
      (state.panelType === "model" && !isAuthenticated && inProgress === "none")
    ) {
      console.log("[QuodsiApp_v2] Conditions met to hide loading screen");
      setIsLoading(false);
    }
  }, [state.panelType, inProgress, isAuthenticated, state.currentElement]);

  // In QuodsiApp_v2.tsx

  // Respond to authentication state changes
  useEffect(() => {
    if (isAuthenticated && userInfo && state.panelType === "model") {
      console.log(
        "[QuodsiApp_v2] Authentication detected in model panel, initializing"
      );

      // Refresh the UI when authentication state changes
      setState((prev) => ({
        ...prev,
        isAuthenticated,
        userInfo,
      }));

      // Also tell the TypeScript controller about the change
      messageService.current.sendMessage(MessageTypes.AUTH, {
        type: AuthActionType.STATUS_RESPONSE,
        data: {
          isAuthenticated,
          userInfo,
        },
      });
    }
  }, [isAuthenticated, userInfo, state.panelType]);

  // Also add a safety timeout (optional but recommended)
  useEffect(() => {
    if (isLoading) {
      const safetyTimer = setTimeout(() => {
        console.log(
          "[QuodsiApp_v2] Safety timeout reached - forcing loading to false"
        );
        setIsLoading(false);
      }, 5000); // 5 seconds max loading time

      return () => clearTimeout(safetyTimer);
    }
  }, [isLoading]);
  // Create a wrapper for handleViewResults that includes acknowledgeResults
  const handleViewResults = useCallback(() => {
    actionHandlers.current.handleViewResults(acknowledgeResults);
  }, [acknowledgeResults]);

  console.log("[QuodsiApp_v2] Rendering decision:", {
    isLoading,
    panelType: state.panelType,
    inProgress,
    isAuthenticated,
    hasUserInfo: !!userInfo,
    userIsAuthenticated
  });
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
      ) : !userIsAuthenticated ? (
        // Not authenticated - show sign-in message - keeping original condition
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
              onClick={actionHandlers.current.handleRedirectToAuthPanel}
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
            onValidate={actionHandlers.current.handleValidate}
            onElementUpdate={actionHandlers.current.handleElementUpdate}
            referenceData={state.referenceData}
            showModelName={state.showModelName}
            showModelItemName={state.showModelItemName}
            visibleSections={state.visibleSections}
            onSimulate={actionHandlers.current.handleSimulate}
            onRemoveModel={actionHandlers.current.handleRemoveModel}
            onConvertPage={actionHandlers.current.handleConvertPage}
            onElementTypeChange={actionHandlers.current.handleElementTypeChange}
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