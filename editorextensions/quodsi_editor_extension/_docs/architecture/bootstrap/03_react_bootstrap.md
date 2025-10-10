# React Bootstrap (Stages 5-6)

React-side initialization that occurs when the user clicks a panel icon and the iframe loads.

## Overview

The React bootstrap is more complex than extension bootstrap due to asynchronous authentication and the modular effects system. Typical duration: 200-1500ms depending on network.

## Stage 5: React App Load

**Trigger:** User clicks panel icon in LucidChart

**Actions:**
1. LucidChart creates iframe element
2. Browser navigates iframe to panel URL:
   - Auth panel: `quodsim-react/index.html?panel=auth`
   - Model panel: `quodsim-react/index.html?panel=model`
3. Browser loads and parses HTML
4. Browser executes bundled JavaScript

## Stage 6: React Initialization

File: `quodsim-react/src/index.tsx`

### Step 1: Messaging System Initialization

**Lines: index.tsx:8-12**

```typescript
const cleanup = initializeMessaging({
  enableLogging: process.env.NODE_ENV === 'development',
  enableDevTools: process.env.NODE_ENV === 'development',
  logPrefix: "Quodsi",
});
```

**Creates:**
- Global `window.postMessage` listener
- Message handlers registry
- Debug logging infrastructure

### Step 2: Panel Type Detection

**Lines: index.tsx:21-22**

```typescript
const urlParams = new URLSearchParams(window.location.search);
const panelType = urlParams.get("panel") === "auth" ? "auth" : "model";
```

Determines which panel UI to render based on URL query parameter.

### Step 3: React Root Mounting

**Lines: index.tsx:25-30**

```typescript
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App panelType={panelType as "auth" | "model"} />
  </React.StrictMode>
);
```

## Component Hierarchy

File: `quodsim-react/src/App.tsx`

```
App (panelType prop)
  └─> MsalProvider (instance={msalInstance})
       └─> MessageProvider (initialPanelType={panelType})
            └─> LucidApp (panelType={panelType})
                 ├─> AuthPanel (if panelType === 'auth')
                 └─> ModelPanel (if panelType === 'model')
```

### MSAL Provider
- **Purpose**: Azure AD authentication
- **Config**: `msalConfig` from `config/msalConfig.ts`
- **Creates**: PublicClientApplication for OAuth flows

### MessageProvider

File: `quodsim-react/src/messaging/MessageProvider.tsx`

**Core Responsibilities:**
1. State management via reducer
2. Message handling orchestration
3. Authentication lifecycle coordination
4. REACT_APP_READY determination and sending

**State Structure:**
```typescript
{
  app: {
    initialized: boolean,
    panelType?: 'auth' | 'model'
  },
  auth: {
    isAuthenticated: boolean,
    userInfo?: QuodsiUserInfo,
    silentAuthInProgress: boolean,
    lastUpdated?: number
  },
  selection: { ... },
  simulation: { ... },
  validation: { ... }
}
```

### Ref-Based Tracking

MessageProvider uses refs to track initialization progress:

```typescript
const hasSentReadyRef = useRef(false);
const authInitializedRef = useRef(false);
const silentAuthCheckCompletedRef = useRef(false);
const processedMessageIds = useRef(new Set<string>());
```

**Why refs?**
- Persist across renders without causing re-renders
- Track one-time events (like REACT_APP_READY)
- Prevent duplicate message processing

## Effects System

File: `quodsim-react/src/messaging/effects/`

MessageProvider initializes 7+ specialized effects:

### Authentication Effects

**useInitialAuthCheckEffect** (`effects/authEffects.ts`)
- Runs once on mount
- Immediately checks localStorage for cached auth
- Fastest auth path (synchronous)

**useAuthInitializationEffect** (`effects/authEffects.ts`)
- Watches for `state.auth.lastUpdated` to be set
- Sets `authInitializedRef.current = true` when auth state has timestamp

**useSilentAuthCompletionEffect** (`effects/authEffects.ts`)
- Watches for `state.auth.silentAuthInProgress` to become false
- Sets `silentAuthCheckCompletedRef.current = true` when complete

**useAuthStateChangeEffect** (`effects/authEffects.ts`)
- Comprehensive tracking of all auth state changes
- Redundant safety mechanism to ensure auth completes
- Calls `ensureAuthState()` to validate localStorage

### Initialization Effects

**usePanelTypeDetectionEffect** (`effects/initializationEffects.ts`)
- Detects panel type from URL
- Sets `state.app.initialized = true`
- Sets `state.app.panelType`

### REACT_APP_READY Effect

**useReactAppReadyEffect** (`effects/reactAppReadyEffects.ts`)

**Trigger Conditions (all must be true):**
1. `!hasSentReadyRef.current` - Haven't sent yet
2. `state.app.initialized` - App initialized
3. `state.app.panelType` - Panel type determined
4. `!state.auth.silentAuthInProgress` - Auth check complete

**Actions when triggered:**
1. Call `ensureAuthState()` - validates localStorage
2. Force-set refs if conditions met
3. Send REACT_APP_READY message via `sendMessage()`
4. Set `hasSentReadyRef.current = true`

**Message payload:**
```typescript
{
  panel: 'auth' | 'model',
  isAuthenticated: boolean,
  user: QuodsiUserInfo | undefined
}
```

**Emergency Timer:**

There's also a 3-second emergency timer that forces REACT_APP_READY if normal flow stalls. See [04_messaging_handshake.md](./04_messaging_handshake.md#emergency-fallback).

### Message Listener Effect

**useMessageListenerEffect** (`effects/messageListenerEffect.ts`)
- Sets up `window.addEventListener('message', handler)`
- Routes incoming messages to appropriate handlers
- Prevents duplicate processing via `processedMessageIds` ref

## Silent Authentication Flow

File: `quodsim-react/src/hooks/useSilentAuth.ts`

**Execution:**
1. Component mounts
2. `useSilentAuth()` hook runs
3. Checks localStorage for cached token
4. If found: validates and updates state
5. If not found: attempts MSAL silent auth (acquireTokenSilent)
6. Sets `silentAuthInProgress = false` when complete

**Duration:** 500-1500ms (network dependent)

**States:**
```
silentAuthInProgress: true (initial)
  ↓
[localStorage check or MSAL call]
  ↓
silentAuthInProgress: false (complete)
lastUpdated: timestamp
isAuthenticated: true/false
```

## Initialization Completion Criteria

For REACT_APP_READY to be sent, all these must be true:

```typescript
state.app.initialized === true
state.app.panelType !== undefined
state.auth.silentAuthInProgress === false
hasSentReadyRef.current === false
```

**Timeline:**
```
0ms:    React mounts
50ms:   Panel type detected → initialized=true
100ms:  Silent auth starts → silentAuthInProgress=true
500ms:  Silent auth completes → silentAuthInProgress=false
501ms:  REACT_APP_READY triggered (all conditions met)
```

## Component Rendering

Once MessageProvider is initialized, it renders `LucidApp`:

### AuthPanel (panelType === 'auth')
- Login/logout UI
- User profile display
- Authentication status

### ModelPanel (panelType === 'model')
- Model editing UI
- Selection-based forms
- Validation messages
- Simulation controls

Both panels have access to messaging context:
```typescript
const { auth, selection, sendMessage } = useMessaging();
```

## Next Steps

After React initialization completes and REACT_APP_READY is sent:
- See: [04_messaging_handshake.md](./04_messaging_handshake.md) for the communication handshake
