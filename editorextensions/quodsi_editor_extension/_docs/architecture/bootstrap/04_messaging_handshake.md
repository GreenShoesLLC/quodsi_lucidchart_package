# Messaging Handshake (Stages 7-8)

The handshake establishes bidirectional communication between the extension and React panels, transitioning the system to operational state.

## Stage 7: Communication Handshake

### REACT_APP_READY Message

**Sent from:** React panel (MessageProvider)
**Received by:** Extension (MessageRouter)
**Protocol:** postMessage via iframe

**Message Structure:**
```typescript
{
  id: string,
  type: EnvelopeMessageType.REACT_APP_READY,
  source: 'auth-iframe' | 'model-iframe',
  target: 'host',
  version: '1.0',
  data: {
    panel: 'auth' | 'model',
    isAuthenticated: boolean,
    user?: QuodsiUserInfo
  }
}
```

### React Side: Sending REACT_APP_READY

File: `quodsim-react/src/messaging/effects/reactAppReadyEffects.ts`

**Normal Flow:**

Function: `useReactAppReadyEffect()`

**Trigger Conditions:**
```typescript
!hasSentReadyRef.current &&
state.app.initialized &&
state.app.panelType &&
!state.auth.silentAuthInProgress
```

**Actions (lines 88-102):**
1. Call `ensureAuthState()` to validate localStorage
2. Force-set refs if needed
3. Send message via `sendMessage(EnvelopeMessageType.REACT_APP_READY, data)`
4. Set `hasSentReadyRef.current = true` (prevents duplicate sends)

### Emergency Fallback

Function: `useEmergencyReactAppReadyEffect()`

**Purpose:** Ensures REACT_APP_READY is sent even if normal flow stalls.

**Trigger:** 3-second timer from component mount

**Actions (lines 136-166):**
1. Check if REACT_APP_READY already sent
2. If not sent and app initialized:
   - Force-set all tracking refs to true
   - Call `ensureAuthState()` for auth data
   - Force send REACT_APP_READY
   - Log warning about emergency send

**Why needed?**
- Network delays in silent auth
- Race conditions in effect execution
- Ensures initialization always completes

### Extension Side: Receiving REACT_APP_READY

File: `src/core/messaging/MessageRouter.ts`

**Entry point:** `MessageRouter.receive(msg)` (line 201)

**Flow:**
1. Panel forwards message via `messageFromFrame()`
2. Panel adds `_panelRef` to message for recovery
3. Router validates envelope with `isEnvelope(msg)`
4. Detects `REACT_APP_READY` type (line 224)
5. Calls `handleReactAppReady(msg)` (line 226)

### handleReactAppReady() Flow

Function: `MessageRouter.handleReactAppReady(msg)` (lines 250-296)

**Step 1: Extract Panel Role**
```typescript
const role = data.panel as PanelRole; // 'auth' | 'model'
```

**Step 2: Register Panel (if needed)**
```typescript
if ((msg as any)._panelRef) {
  this.registerChannel(role, (msg as any)._panelRef);
}
```

**Step 3: Mark Channel Ready**
```typescript
this.channelManager.markChannelReady(role);
```

**Actions in ChannelManager:**
- Sets `channel.ready = true`
- Enables message delivery to this channel

**Step 4: Update Auth State**
```typescript
if (data.isAuthenticated !== undefined) {
  this.state.updateAuthState({
    isAuthenticated: data.isAuthenticated,
    user: data.user
  });
}
```

**Step 5: Ensure Panel Reference**
```typescript
this.ensureChannelHasPanel(role);
```

**Actions:**
- Verifies channel has valid panel reference
- If not, attempts recovery from global registry
- Returns true/false for success

**Step 6: Flush Queued Messages**
```typescript
this.channelManager.flushQueue(role);
```

**Actions:**
- Retrieves all queued messages for this channel
- Sends each message via `channel.panel.relayToIframe(msg)`
- Clears queue

**Step 7: Send Initial State**
```typescript
this.sendAuthStatus(role);
this.sendSubscriptionStatus(role);
```

**sendAuthStatus()** (lines 301-310):
- Sends current auth state from RouterState
- Message type: `AUTH_STATUS`

**sendSubscriptionStatus()** (lines 336-348):
- Sends subscription tier, status, feature flags
- Message type: `SUBSCRIPTION_STATUS`
- Only sent if subscription data exists

**Step 8: Request Model Context**
```typescript
this.requestModelContext(role);
```

**Actions (lines 371-392):**
- Gets panel from channel
- Calls `panel.sendModelContext()` if method exists
- For RightDockPanel: triggers `initializeModelContext()`

### RightDockPanel.sendModelContext()

File: `src/panels/RightDockPanel.ts:297-299`

Calls `initializeModelContext()` which:
1. Gets document and page info from EditorClient
2. Determines if page is a Quodsi model via ModelManager
3. Calls `SelectionHandler.setDocumentContext()`
4. Sends `SELECTION_CHANGED` with document context

## Message Queue System

### Before REACT_APP_READY

**Scenario:** Extension tries to send message before React ready

**Flow:**
```typescript
router.send('model', msg)
  ↓
channelManager.enqueueOrSend('model', msg)
  ↓
if (!channel.ready) {
  channel.queue.push(msg); // Store for later
}
```

### After REACT_APP_READY

**Flow:**
```typescript
channelManager.flushQueue('model')
  ↓
for (msg of channel.queue) {
  channel.panel.relayToIframe(msg);
}
  ↓
channel.queue = []; // Clear queue
```

## Panel Recovery Mechanism

### Global Registry

Both panels register themselves in `window.quodsiExtension.panels`:

**ContentDockPanel** (line 76):
```typescript
(window as any).quodsiExtension.panels.auth = this;
```

**RightDockPanel** (via MessageRouter.storeInGlobalRegistry):
```typescript
(window as any).quodsiExtension.panels.model = panel;
```

### Recovery Flow

If MessageRouter loses panel reference:

**MessageRouter.ensureChannelHasPanel()** (lines 140-163):
1. Checks if channel has valid panel
2. If not, calls `retrieveFromGlobalRegistry(role)`
3. Re-registers panel if found
4. Returns success/failure

**Why needed?**
- Panel reference can be lost during re-registration
- Provides resilience against edge cases
- Ensures messages always reach panels

## Stage 8: Operational State

After handshake completes, system is fully operational:

### ✅ Bidirectional Communication
- Extension can send messages to React panels
- React panels can send messages to extension
- No more message queuing (direct delivery)

### ✅ State Synchronization
- Auth state synced between panels
- Selection state broadcasts to model panel
- Subscription status available

### ✅ Selection Updates
- User selects shapes → SelectionHandler
- SelectionHandler → MessageRouter
- MessageRouter → Model panel
- Model panel updates UI

### ✅ User Interaction Ready
- Auth panel: can login/logout
- Model panel: can edit elements, run simulations

## Handshake State Machine

```
[React Mounted]
      ↓
[Effects Initializing]
      ↓
[Auth Check Complete]
      ↓
[REACT_APP_READY Sent] ← Emergency Timer (3s)
      ↓
[Extension Receives]
      ↓
[Register Panel]
      ↓
[Mark Channel Ready]
      ↓
[Flush Queue]
      ↓
[Send Initial State]
      ↓
[Request Model Context]
      ↓
[OPERATIONAL]
```

## Timing Analysis

| Step | Typical Duration | Notes |
|------|-----------------|-------|
| React detects ready | ~500-1500ms | Depends on auth |
| Send REACT_APP_READY | < 1ms | postMessage is fast |
| Extension receives | < 10ms | Event loop delay |
| handleReactAppReady | < 5ms | Synchronous |
| Flush queue | < 10ms per message | Depends on queue size |
| Total handshake | ~1-10ms | After REACT_APP_READY sent |

## Next Steps

- **Debugging handshake issues**: See [05_troubleshooting.md](./05_troubleshooting.md)
- **Understanding MessageRouter**: See future `architecture/messaging/` docs
- **Understanding panels**: See future `architecture/panels/` docs
