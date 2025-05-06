// src/components/auth/DebugPanel.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { msalConfig } from "./authConfig";

export const DebugPanel: React.FC = () => {
  const { isAuthenticated, userInfo, handleSignOut, isProcessingAuth } =
    useAuth();

  const [sessionData, setSessionData] = useState<Record<string, any>>({});

  // Collect debug information
  useEffect(() => {
    try {
      // Gather session storage data
      const sessionStorageData: Record<string, any> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          try {
            const value = sessionStorage.getItem(key);
            sessionStorageData[key] = value;
          } catch (e) {
            sessionStorageData[key] = "[Error reading value]";
          }
        }
      }

      // Get current URL info
      const urlInfo = {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        hash: window.location.hash,
        search: window.location.search,
      };

      // Is in iframe?
      let isInIframe = false;
      try {
        isInIframe = window !== window.parent;
      } catch (e) {
        isInIframe = true;
      }

      // Collect data
      setSessionData({
        isAuthenticated,
        userInfo,
        msalConfig: {
          clientId: msalConfig.auth.clientId,
          authority: msalConfig.auth.authority,
          redirectUri: msalConfig.auth.redirectUri,
        },
        urlInfo,
        isInIframe,
        sessionStorage: sessionStorageData,
      });
    } catch (error) {
      console.error("Error collecting debug info:", error);
      setSessionData({ error: String(error) });
    }
  }, [isAuthenticated, userInfo]);

  // Force sign out - clears all auth state
  const forceSignOut = () => {
    // Clear all session storage
    sessionStorage.clear();

    // Clear any local storage related to auth
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("msal") || key.includes("auth"))) {
        localStorage.removeItem(key);
      }
    }

    // Clear any cookies
    document.cookie.split(";").forEach((cookie) => {
      const [name] = cookie.trim().split("=");
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });

    // Call the normal sign out handler
    handleSignOut();

    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="mt-4 p-3 border border-gray-300 rounded bg-gray-50">
      <h3 className="text-sm font-bold mb-2">Debug Panel</h3>

      <div className="mb-3">
        <p className="text-xs">
          Auth State:{" "}
          <span
            className={`font-bold ${
              isAuthenticated ? "text-green-600" : "text-red-600"
            }`}
          >
            {isAuthenticated ? "Authenticated" : "Not Authenticated"}
          </span>
        </p>

        {userInfo && (
          <div className="text-xs mt-1">
            <p>
              User: {userInfo.name} ({userInfo.email})
            </p>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={handleSignOut}
          disabled={isProcessingAuth || !isAuthenticated}
          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
        >
          Normal Sign Out
        </button>

        <button
          onClick={forceSignOut}
          className="px-3 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-800"
        >
          Force Sign Out
        </button>
      </div>

      <div className="mt-3">
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">
            Show Debug Info
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};
