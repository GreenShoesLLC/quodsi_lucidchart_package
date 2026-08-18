import { configureLogger, consoleSink, installDebugGlobal, getLogger } from '@quodsi/lucid-shared';

// See extension.ts for the rationale. namespaceLevels below is the former
// React debug service's disabledComponents set (now retired), captured as
// config data.
// 'warn', not 'error'. The retired React debugService gated only .log and
// .debug on its enabled flag - .error and .warn printed unconditionally - so
// pinning these to 'error' would silence warns that always used to show. The
// extension's map is 'error' because ExtensionDebugService gated all five
// methods, making mute there mean "errors only".
configureLogger({
    level: import.meta.env.DEV ? 'debug' : 'warn',
    namespaceLevels: {
        useSilentAuth: 'warn',
        useAuthState: 'warn',
        MessageProvider: 'warn',
        ElementOpsMapper: 'warn',
        AuthMapper: 'warn',
        useSendMessage: 'warn',
        RxMessageHandlers: 'warn',
        AuthStatusHandler: 'warn',
        ReactAppReadyEffects: 'warn',
        MessageListenerEffect: 'warn',
        InitializationEffects: 'warn',
        AuthEffects: 'warn',
        AuthPanel: 'warn',
        LucidAppNew: 'warn',
        MessageMapper: 'warn',
        AuthStorageService: 'warn',
        useModelPanel: 'warn',
        ModelItemMapper: 'warn',
        SelectionMapper: 'warn',
        SelectionSlice: 'warn',
    },
    sinks: [consoleSink()],
});
installDebugGlobal();

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeMessaging } from "./messaging/initializeMessaging";
import "./index_new.css";

const log = getLogger('index');

// Initialize the messaging system
const cleanup = initializeMessaging({
  enableLogging: import.meta.env.DEV,
  enableDevTools: import.meta.env.DEV,
  logPrefix: "Quodsi",
});

// Find the new root element, fallback to the standard one if needed
const rootElement = document.getElementById("root");

if (!rootElement) {
  log.error("Could not find root element to mount application");
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
