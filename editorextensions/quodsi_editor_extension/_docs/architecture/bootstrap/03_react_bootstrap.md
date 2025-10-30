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
const panelType = urlParams.get("panel") || "model";
```

Determines which panel UI to render based on URL query parameter (defaults to "model").

### Step 3: React Root Mounting

**Lines: index.tsx:25-30**

```typescript
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App panelType={panelType as "model"} />
  </React.StrictMode>
);
```

## Component Hierarchy

File: `quodsim-react/src/App.tsx`

```
App (panelType prop)
  └─> MessageProvider (initialPanelType={panelType})
       └─> LucidApp (panelType={panelType})
            └─> ModelPanel
```

### MessageProvider

File: `quodsim-react/src/messaging/MessageProvider.tsx`

**Core Responsibilities:**
1. State management via reducer
2. Message handling orchestration
3. REACT_APP_READY determination and sending

**State Structure:**
```typescript
{
  app: {
    initialized: boolean,
    panelType?: 'model'
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
const processedMessageIds = useRef(new Set<string>());
```

**Why refs?**
- Persist across renders without causing re-renders
- Track one-time events (like REACT_APP_READY)
- Prevent duplicate message processing

## Effects System

File: `quodsim-react/src/messaging/effects/`

MessageProvider initializes specialized effects:

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

**Actions when triggered:**
1. Force-set refs if conditions met
2. Send REACT_APP_READY message via `sendMessage()`
3. Set `hasSentReadyRef.current = true`

**Message payload:**
```typescript
{
  panel: 'model'
}
```

**Emergency Timer:**

There's also a 3-second emergency timer that forces REACT_APP_READY if normal flow stalls. See [04_messaging_handshake.md](./04_messaging_handshake.md#emergency-fallback).

### Message Listener Effect

**useMessageListenerEffect** (`effects/messageListenerEffect.ts`)
- Sets up `window.addEventListener('message', handler)`
- Routes incoming messages to appropriate handlers
- Prevents duplicate processing via `processedMessageIds` ref

## Initialization Completion Criteria

For REACT_APP_READY to be sent, all these must be true:

```typescript
state.app.initialized === true
hasSentReadyRef.current === false
```

**Timeline:**
```
0ms:    React mounts
50ms:   App initialized → initialized=true
100ms:  Effects complete
150ms:  REACT_APP_READY triggered (all conditions met)
```

## Component Rendering

Once MessageProvider is initialized, it renders `LucidApp`:

### ModelPanel
- Model editing UI
- Selection-based forms
- Validation messages
- Simulation controls

The panel has access to messaging context:
```typescript
const { selection, simulation, validation, sendMessage } = useMessaging();
```

## Next Steps

After React initialization completes and REACT_APP_READY is sent:
- See: [04_messaging_handshake.md](./04_messaging_handshake.md) for the communication handshake
