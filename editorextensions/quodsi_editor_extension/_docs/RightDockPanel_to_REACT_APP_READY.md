# Right Dock Panel to React App Ready Flow

This document outlines the initialization flow and messaging process between the LucidChart extension and the React application, specifically focusing on the sequence from when the user clicks on the Right Dock Panel icon to when the React application sends the `REACT_APP_READY` message.

## Architecture Overview

The Quodsi LucidChart extension consists of several interconnected components:

1. **Extension Host**: Written in TypeScript using the LucidChart Extension SDK
2. **React Application**: A React 18 with TypeScript application that serves as the UI
3. **Messaging System**: Communication bridge between the extension host and React application
4. **Authentication System**: Microsoft Authentication Library (MSAL) integration for user authentication

## Initialization Flow

### 1. User Interaction Trigger

The flow begins when a user clicks on the right dock panel icon in LucidChart.

```typescript
// In RightDockPanel.ts
constructor(client: EditorClient, modelManager: ModelManager) {
    super(client, {
        title: 'Quodsi Model',
        url: 'quodsim-react/index.html?panel=model', // Query param helps React app identify panel type
        location: PanelLocation.RightDock,
        iconUrl: 'https://lucid.app/favicon.ico',
        width: 300
    });
    
    this.modelManager = modelManager;
    
    // Enable logging for RightDockPanel by default for easier debugging
    this.loggingEnabled = true;
}
```

The panel is created with a URL that points to the React application's entry point, passing a query parameter `panel=model` to identify the panel type.

### 2. React Application Loading

When LucidChart loads the panel, it creates an iframe with the URL specified above, which loads the React application.

The entry point is `index.tsx`, which:

1. Initializes the messaging system
2. Identifies the panel type from URL parameters 
3. Creates the React root and renders the main application component

```typescript
// In index.tsx
const rootElement = document.getElementById('root');

// Determine the panel type from URL for direct initialization
const urlParams = new URLSearchParams(window.location.search);
const panelType = urlParams.get('panel') === 'auth' ? 'auth' : 'model';

// Use the createRoot API
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App_new panelType={panelType as 'auth' | 'model'} />
  </React.StrictMode>
);
```

### 3. Authentication Provider Setup

The main application component (`App_new.tsx`) sets up authentication with MSAL using the same approach as the ContentDockPanel:

```typescript
// In App_new.tsx
const msalInstance = new PublicClientApplication(msalConfig);

return (
  <MsalProvider instance={msalInstance}>
    <MessageProvider initialPanelType={currentPanelType}>
      <div className="app-new-container">
        <LucidApp panelType={currentPanelType} />
      </div>
    </MessageProvider>
  </MsalProvider>
);
```

Key components of the authentication setup:
- Uses the official `MsalProvider` component from `@azure/msal-react`
- Creates MSAL instance with `PublicClientApplication(msalConfig)`
- Sets up the message provider for app-wide state management

### 4. Silent Authentication Process

The RightDockPanel also uses the silent authentication process:

```typescript
// In useSilentAuth.ts
export function useSilentAuth(): void {
  const { instance, accounts, inProgress } = useMsal();
  const dispatch = useMessagingDispatch();
  
  useEffect(() => {
    // Start with marking auth as loading
    dispatch({
      type: 'AUTH_LOADING',
      isLoading: true
    });
    
    // When MSAL is initialized, attempt silent authentication
    if (inProgress === 'none') {
      const attemptSilentAuth = async () => {
        try {
          // Check if we have any accounts in MSAL cache
          if (accounts.length > 0) {
            const account = accounts[0];
            
            // Set active account
            instance.setActiveAccount(account);
            
            // Create user info
            const userInfo = {
              id: account.localAccountId,
              email: account.username,
              displayName: account.name || account.username
            };
            
            // Update auth state
            dispatch({
              type: 'AUTH_STATUS_UPDATE',
              isAuthenticated: true,
              userInfo
            });
          } else {
            // Check localStorage as fallback
            const storedAuth = AuthStorageService.loadAuthState();
            
            if (storedAuth && storedAuth.isAuthenticated && storedAuth.userInfo) {
              dispatch({
                type: 'AUTH_STATUS_UPDATE',
                isAuthenticated: true,
                userInfo: storedAuth.userInfo || undefined
              });
            } else {
              dispatch({
                type: 'AUTH_STATUS_UPDATE',
                isAuthenticated: false,
                userInfo: undefined
              });
            }
          }
        } catch (error) {
          dispatch({
            type: 'AUTH_STATUS_UPDATE',
            isAuthenticated: false,
            userInfo: undefined
          });
        } finally {
          dispatch({
            type: 'AUTH_LOADING',
            isLoading: false
          });
        }
      };
      
      attemptSilentAuth();
    }
  }, [inProgress, accounts, dispatch, instance]);
}
```

This hook is used by the MessageProvider to ensure authentication state is properly initialized when the application loads.

### 5. Panel Registration and Message Management

When the RightDockPanel is mounted, it registers with the router:

```typescript
// In RightDockPanel.ts
protected didMount(): void {
    this.log('didMount called');
    console.log('[EXT][RightDockPanel] didMount called - registering with router as "model" panel');
    
    // Register with the router
    router.registerChannel('model', this);
    
    this.log('Registered with message router');
}
```

When the iframe loads, the frameLoaded method is called:

```typescript
// In RightDockPanel.ts
protected frameLoaded(): void {
    this.log('Frame loaded');
    console.log('[EXT][RightDockPanel] frameLoaded called');
    
    // Call parent method first to maintain proper behavior
    super.frameLoaded();
    
    // Additional initialization if needed
    this.isReady = true;
    
    // Re-register with the router to ensure we have a valid reference
    console.log('[EXT][RightDockPanel] Re-registering with router as "model" panel');
    router.registerChannel('model', this);
    
    // Dump channel state to diagnose any issues
    console.log('[EXT][RightDockPanel] Dumping channel state for diagnosis');
    if (typeof router.dumpChannelState === 'function') {
        router.dumpChannelState();
    }
    
    // NOTE: We removed the immediate auth state request because it happens before
    // silent authentication completes. Instead, we rely on the REACT_APP_READY flow.
    // When the React app completes initialization, it will send REACT_APP_READY, and
    // the router will send back the current auth state at that point.
    console.log('[EXT][RightDockPanel] Waiting for REACT_APP_READY from React app for auth status');
}
```

The RightDockPanel has a method to request authentication status, but it is not automatically called:

```typescript
// In RightDockPanel.ts
private requestAuthStatus(): void {
    console.log('[EXT][RightDockPanel] Requesting current auth state');
    try {
        // First try using the channel manager's force deliver method
        const channelManager = router.getChannelManager();
        if (channelManager && typeof channelManager.forceDeliverMessage === 'function') {
            console.log('[EXT][RightDockPanel] Using forceDeliverMessage for AUTH_STATUS');
            const authState = router.getAuthState();
            channelManager.forceDeliverMessage('model', EnvelopeMessageType.AUTH_STATUS, authState);
            console.log('[EXT][RightDockPanel] Force delivered auth state:', authState);
        } else {
            // Fallback to a direct broadcast request
            console.log('[EXT][RightDockPanel] Using direct send for AUTH_STATUS');
            const authState = router.getAuthState();
            router.send('model', {
                id: `auth_status_request_${Date.now()}`,
                type: EnvelopeMessageType.AUTH_STATUS,
                source: 'host',
                target: 'model-iframe',
                version: '1.0',
                data: authState || { isAuthenticated: false }
            });
            
            console.log('[EXT][RightDockPanel] Direct sent auth state:', authState);
            
            // Also broadcast to all panels for redundancy
            router.broadcastAuthStatus();
        }
    } catch (err) {
        console.error('[EXT][RightDockPanel][ERROR] Error requesting auth state:', err);
    }
}
```

The RightDockPanel also has specific handling for `AUTH_STATUS` messages:

```typescript
// In RightDockPanel.ts
public relayToIframe(msg: EnvelopeBase): void {
    this.log(`Relaying message to iframe: ${msg.type}`);
    console.log(`[EXT][RightDockPanel] relayToIframe called with msg type: ${msg.type}`);
    
    // Special logging for auth status
    if (msg.type === EnvelopeMessageType.AUTH_STATUS) {
        console.log('[EXT][RightDockPanel] Relaying AUTH_STATUS to iframe:', msg.data);
    }

    try {
        // Use a type assertion to bypass TypeScript's type checking
        this.sendMessage(msg as unknown as JsonSerializable);
        console.log(`[EXT][RightDockPanel] sendMessage completed for ${msg.type}`);
    } catch (err) {
        console.error(`[EXT][RightDockPanel][ERROR] Error in sendMessage:`, {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            msgType: msg.type
        });
    }
}
```

### 6. Message Provider Initialization on the React Side

The MessageProvider component in the React application is responsible for sending the `REACT_APP_READY` message when initialization is complete:

```typescript
// In MessageProvider.tsx
useEffect(() => {
  // Add message event listener
  window.addEventListener("message", handleMessage);

  // Send REACT_APP_READY when all conditions are met:
  // 1. App is initialized
  // 2. Panel type is determined
  // 3. Auth is initialized (no longer loading)
  // 4. We haven't sent it already
  if (
    state.app.initialized && 
    state.app.panelType && 
    authInitializedRef.current && 
    !hasSentReadyRef.current
  ) {
    logger.log("All conditions met for sending REACT_APP_READY:", {
      appInitialized: state.app.initialized,
      panelType: state.app.panelType,
      authInitialized: authInitializedRef.current,
      isAuthenticated: state.auth.isAuthenticated,
      hasUserInfo: !!state.auth.userInfo
    });
    
    sendMessage(EnvelopeMessageType.REACT_APP_READY, {
      panel: state.app.panelType,
      isAuthenticated: state.auth.isAuthenticated,
      user: state.auth.userInfo,
    });
    
    // Mark as sent so we don't send it again
    hasSentReadyRef.current = true;
    
    logger.log("Sent REACT_APP_READY message with auth state:", {
      isAuthenticated: state.auth.isAuthenticated,
      hasUserInfo: !!state.auth.userInfo
    });
  } else if (!hasSentReadyRef.current) {
    logger.debug("Waiting to send REACT_APP_READY:", {
      appInitialized: state.app.initialized,
      panelType: state.app.panelType,
      authInitialized: authInitializedRef.current,
      authLoading: state.auth.isLoading,
      isAuthenticated: state.auth.isAuthenticated
    });
  }

  // Cleanup listener on unmount
  return () => {
    window.removeEventListener("message", handleMessage);
  };
}, [
  sendMessage,
  state.app.initialized,
  state.app.panelType,
  state.auth.isAuthenticated,
  state.auth.userInfo,
  state.app.pendingRequests,
  state.auth.isLoading, // Add this dependency to trigger when auth loading changes
]);
```

### 7. Extension Side Handling of REACT_APP_READY

When the React application sends the `REACT_APP_READY` message, the RightDockPanel forwards it to the router, which processes it and responds with the current authentication state:

```typescript
// In RouterCore.ts
private handleReactAppReady(msg: EnvelopeBase): void {
    const data = msg.data as any;
    const role = data.panel as PanelRole;
    
    if (!role) {
        this.logDebug(`Invalid panel role in REACT_APP_READY`);
        return;
    }
    
    console.log(`[EXT][MessageRouter] Marking channel ${role} as ready`);
    
    // If we have a panel reference in the message, register it
    if ((msg as any)._panelRef) {
        console.log(`[EXT][MessageRouter] Registering panel from REACT_APP_READY message for ${role}`);
        this.registerChannel(role, (msg as any)._panelRef);
    }
    
    // Mark channel as ready
    this.channelManager.markChannelReady(role);
    
    // Update auth state if provided
    if (data.isAuthenticated !== undefined) {
        this.state.updateAuthState({
            isAuthenticated: data.isAuthenticated,
            user: data.user
        });
    }
    
    // Ensure the channel has a panel before flushing
    console.log(`[EXT][MessageRouter] Flushing queue for ${role}:`, {
        queueSize: this.channelManager.getChannel(role)?.queue.length,
        hasPanel: this.ensureChannelHasPanel(role),
        isReady: this.channelManager.isChannelReady(role)
    });
    
    // Flush queued messages
    this.channelManager.flushQueue(role);
    
    // Send current auth and subscription state
    this.sendAuthStatus(role);
    this.sendSubscriptionStatus(role);
}
```

The router responds with the current authentication state by calling `sendAuthStatus(role)`.

## Authentication State Handling Specific to RightDockPanel

Unlike the ContentDockPanel, the RightDockPanel does not have its own specific UI component for handling authentication. Instead, it relies on:

1. Silent authentication through MSAL
2. Receiving AUTH_STATUS messages from the router
3. Displaying authentication state in the model panel UI

When the RightDockPanel receives an AUTH_STATUS message, it should update its UI to reflect whether the user is authenticated.

## Waiting Behavior

A key aspect of the RightDockPanel initialization is the explicit note that it waits for the REACT_APP_READY message before attempting to request authentication status:

```typescript
// NOTE: We removed the immediate auth state request because it happens before
// silent authentication completes. Instead, we rely on the REACT_APP_READY flow.
// When the React app completes initialization, it will send REACT_APP_READY, and
// the router will send back the current auth state at that point.
console.log('[EXT][RightDockPanel] Waiting for REACT_APP_READY from React app for auth status');
```

This approach assumes that the router will correctly send the current authentication state after receiving the REACT_APP_READY message.

## Complete RightDockPanel Initialization Flow Diagram

```
User clicks RightDockPanel icon
    │
    ▼
LucidChart creates iframe with React app
    │
    ▼
App_new.tsx renders with MsalProvider
    │
    ▼
MessageProvider initializes
    │
    ▼
useSilentAuth checks for existing accounts
    │
    ▼
Authentication state initialized from MSAL or localStorage
    │
    ▼
APP_INITIALIZE action dispatched
    │
    ▼
state.app.initialized becomes true
    │
    ▼
REACT_APP_READY message sent to extension host
    │
    ▼
RightDockPanel.messageFromFrame receives message
    │
    ▼
Message forwarded to router.receive()
    │
    ▼
RouterCore handles message with handleReactAppReady()
    │
    ▼
Router updates auth state and marks channel as ready
    │
    ▼
Router sends current auth & subscription state back to panel
    │
    ▼
RightDockPanel UI renders with auth state
```
