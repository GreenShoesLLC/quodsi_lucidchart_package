import React from "react";
import ReactDOM from "react-dom/client";
import App_new from "./App_new";
import { initializeMessaging } from "./messaging/initializeMessaging";
import "./index_new.css";

// Initialize the messaging system
const cleanup = initializeMessaging({
  enableLogging: true,
  enableDevTools: true,
  logPrefix: "Quodsi [New]",
});

// Find the new root element, fallback to the standard one if needed
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Could not find root element to mount application");
} else {
  // Determine the panel type from URL for direct initialization
  const urlParams = new URLSearchParams(window.location.search);
  const panelType = urlParams.get("panel") === "auth" ? "auth" : "model";

  // Use the new createRoot API
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App_new panelType={panelType as "auth" | "model"} />
    </React.StrictMode>
  );
}

// Clean up on unload
window.addEventListener("unload", () => {
  if (cleanup) cleanup();
});
