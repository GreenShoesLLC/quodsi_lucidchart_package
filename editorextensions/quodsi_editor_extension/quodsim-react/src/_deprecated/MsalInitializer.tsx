// src/auth/components/MsalInitializer.tsx
import React, { useState, useEffect } from "react";
import { IPublicClientApplication } from "@azure/msal-browser";
import { handleRedirectAfterInitialization } from "./msalSetup";

/**
 * Props for the MsalInitializer component
 */
interface MsalInitializerProps {
  /** The MSAL instance to initialize */
  msalInstance: IPublicClientApplication;
  /** Child components to render after initialization */
  children: React.ReactNode;
}

/**
 * Component that ensures MSAL is initialized before rendering its children
 * Displays loading state and error handling during initialization
 */
export const MsalInitializer: React.FC<MsalInitializerProps> = ({
  msalInstance,
  children,
}) => {
  const [isMsalInitialized, setIsMsalInitialized] = useState(false);
  const [msalError, setMsalError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        // Step 1: Explicitly initialize MSAL first
        await msalInstance.initialize();
        console.log("[MSAL] Initialization complete");

        // Step 2: AFTER initialization completes, handle any redirects
        // This is a critical sequence - handleRedirectPromise must be called
        // after initialize() completes
        await handleRedirectAfterInitialization(msalInstance);

        // Step 3: Mark as initialized
        setIsMsalInitialized(true);
      } catch (error) {
        console.error("[MSAL] Initialization failed:", error);
        setMsalError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeMsal();
  }, [msalInstance]);

  // Display error state
  if (msalError) {
    return (
      <div className="p-4 bg-red-100 text-red-700">
        <h2 className="font-bold">Authentication Error</h2>
        <p>Failed to initialize authentication: {msalError.message}</p>
        <button
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Display loading state
  if (!isMsalInitialized) {
    return (
      <div className="p-4">
        <p>Initializing authentication...</p>
      </div>
    );
  }

  // Render children when initialized
  return <>{children}</>;
};

export default MsalInitializer;
