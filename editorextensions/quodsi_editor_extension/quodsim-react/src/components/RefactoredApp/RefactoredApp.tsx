import React, { useEffect, memo, useCallback } from "react";
import { ErrorDisplay } from "../ui/ErrorDisplay";
import { AuthenticationWrapper } from "../AuthWrapper";
import { ModelPanel } from "../ModelPanel";
import { useUI } from "../../contexts";
import { useMessaging } from "../../hooks/useMessaging";
import { MessageTypes } from "@quodsi/shared";

/**
 * RefactoredApp component that mimics the functionality of QuodsiApp
 * but uses the new context-based architecture.
 * 
 * This is a parallel implementation that can be used for testing
 * without modifying the existing QuodsiApp.
 */
export const RefactoredApp: React.FC = memo(() => {
  // Get UI state and messaging function
  const uiContext = useUI();
  const { sendMessage } = useMessaging();
  
  // Memoize the REACT_APP_READY message sender to prevent unnecessary rerenders
  const sendReadyMessage = useCallback(() => {
    if (sendMessage) {
      console.log('[RefactoredApp] Sending REACT_APP_READY message');
      sendMessage(MessageTypes.REACT_APP_READY);
    }
  }, [sendMessage]);
  
  // If UI context is not available, render minimal content
  if (!uiContext) {
    return <div>RefactoredApp - Contexts not available</div>;
  }
  
  const { state: uiState } = uiContext;
  
  // Initial setup - send REACT_APP_READY message once mounted
  useEffect(() => {
    console.log('[RefactoredApp] Component mounted');
    sendReadyMessage();
    
    return () => {
      console.log('[RefactoredApp] Component unmounted');
    };
  }, [sendReadyMessage]);
  
  return (
    <div className="flex flex-col h-screen">
      {/* Show error message if there is one */}
      {uiState.error && <ErrorDisplay error={uiState.error} />}
      
      {/* Wrap content in auth wrapper to handle auth state */}
      <AuthenticationWrapper>
        <ModelPanel />
      </AuthenticationWrapper>
    </div>
  );
});

// Add display name for debugging
RefactoredApp.displayName = 'RefactoredApp';
