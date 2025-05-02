// src/App.tsx
import React, { useMemo } from "react";
import { AuthProvider } from "./auth/AuthProvider";
import MsalInitializer from "./auth/components/MsalInitializer";
import { createMsalInstance } from "./auth/msalSetup";
import QuodsiApp from "./QuodsiApp_v2";

/**
 * Main application component that sets up authentication and the application
 */
const App: React.FC = () => {
  // Create MSAL instance once using useMemo to avoid recreating on each render
  const msalInstance = useMemo(() => createMsalInstance(), []);

  return (
    <MsalInitializer msalInstance={msalInstance}>
      <AuthProvider msalInstance={msalInstance}>
        <QuodsiApp />
      </AuthProvider>
    </MsalInitializer>
  );
};

export default App;
