import React from 'react';
import { useMsal } from '@azure/msal-react';
import { useAuth } from '../../auth/AuthProvider';
import { useUI } from '../../contexts/UIContext';
import { useMessaging } from '../../hooks/useMessaging';
import { MessageTypes } from '@quodsi/shared';
import { AuthPanel } from '../../components/auth/AuthPanel';

/**
 * AuthenticationWrapper component handles authentication flow and conditional rendering
 * based on the authentication state.
 * 
 * This component doesn't modify the existing QuodsiApp.tsx flow but can be used
 * in parallel with it for testing purposes.
 */
// Updated AuthenticationWrapper
export const AuthenticationWrapper: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // Get authentication state from the auth provider
  const { isAuthenticated } = useAuth();
  const { inProgress } = useMsal();
  
  // Get UI state from context
  const uiContext = useUI();
  const { state: uiState } = uiContext || { state: { panelType: null } };
  
  // Get messaging function
  const { sendMessage } = useMessaging();
  
  // If we're on the auth panel path or the panel type is "auth", show the AuthPanel directly
  if (window.location.pathname.includes('auth') || uiState.panelType === "auth") {
    return <AuthPanel />;
  }
  
  // Handler for redirecting to auth panel
  const handleRedirectToAuthPanel = () => {
    if (sendMessage) {
      sendMessage(MessageTypes.SHOW_AUTH_PANEL);
    }
  };
  
  // If the UI context isn't available, just render children
  // This allows the component to be used without the UI context during testing
  if (!uiContext) {
    return <>{children}</>;
  }
  
  // Show loading while MSAL is initializing
  if (inProgress !== "none") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Initializing authentication...</p>
      </div>
    );
  }
  
  // If not authenticated, show sign in prompt
  if (!isAuthenticated) {
    return (
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
    );
  }
  
  // If we're authenticated, show the children
  return <>{children}</>;
};
