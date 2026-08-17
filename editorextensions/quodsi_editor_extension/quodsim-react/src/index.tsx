import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeMessaging } from "./messaging/initializeMessaging";
import "./index_new.css";

// Initialize the messaging system
const cleanup = initializeMessaging({
  enableLogging: import.meta.env.DEV,
  enableDevTools: import.meta.env.DEV,
  logPrefix: "Quodsi",
});

// Find the new root element, fallback to the standard one if needed
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Could not find root element to mount application");
} else {
  // Always use model panel (auth has been removed)
  const panelType: "model" = "model";

  // Use the new createRoot API
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App panelType={panelType} />
    </React.StrictMode>
  );
}

// Clean up on unload
window.addEventListener("unload", () => {
  if (cleanup) cleanup();
});
