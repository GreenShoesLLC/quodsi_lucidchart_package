# REACT_APP_READY Message Exchange

## Overview
The REACT_APP_READY message is the initial handshake between the React application and the extension. It signals that the React app has fully initialized and is ready to receive messages.

## Message Flow

### REACT_APP_READY: React → Extension

**Direction:** React → Extension  
**Purpose:** Initial handshake to establish communication  
**Auth Required:** No  

**Payload:**
```typescript
{
  panel: string,           // "auth" or "model"
  isAuthenticated: boolean,
  user?: UserInfo
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/effects/reactAppReadyEffects.ts`
- Function: `useReactAppReadyEffect`

**Handler:**
- File: `src/core/messaging/MessageRouter.ts`
- Function: `MessageRouter.handleReactAppReady`

**Response Messages:**
- `AUTH_STATUS` (always sent)
- `SUBSCRIPTION_STATUS` (if authenticated)

## Handler Analysis

| Component | Status | Implementation |
|-----------|--------|---------------|
| React Sender | ✅ Implemented | useReactAppReadyEffect |
| Extension Handler | ✅ Implemented | MessageRouter.handleReactAppReady |
| Extension Sender | ➖ N/A | Not applicable |
| React Handler | ➖ N/A | Not applicable |

## Typical Sequence

1. User clicks panel icon in LucidChart
2. LucidChart creates iframe with React app
3. React app initializes (MessageProvider, etc.)
4. Initial Kinde auth probe completes (via Lucid platform OAuth cache)
5. **REACT_APP_READY** sent to extension
6. Extension marks channel as ready
7. Extension flushes queued messages
8. Extension responds with **AUTH_STATUS**
9. Extension sends **SUBSCRIPTION_STATUS** (if authenticated)

## Implementation Details

### React Side - Sending Conditions
The message is sent when all these conditions are met:
- `state.app.initialized === true`
- `state.app.panelType` is determined
- `!state.auth.silentAuthInProgress`
- `!hasSentReadyRef.current`

### Extension Side - Processing
```typescript
private handleReactAppReady(msg: EnvelopeBase): void {
    const data = msg.data as any;
    const role = data.panel as PanelRole;

    // Register channel and mark as ready
    this.channelManager.markChannelReady(role);
    
    // Update auth state if provided
    if (data.isAuthenticated !== undefined) {
        this.state.updateAuthState({
            isAuthenticated: data.isAuthenticated,
            user: data.user
        });
    }

    // Flush queued messages
    this.channelManager.flushQueue(role);

    // Send current state
    this.sendAuthStatus(role);
    this.sendSubscriptionStatus(role);
}
```

## Error Handling

### React Side
- **Primary mechanism**: `useReactAppReadyEffect` normal flow
- **Emergency fallback**: `useEmergencyReactAppReadyEffect` with 3-second timer
- **Message listener fallback**: Can also trigger from message listener effect

### Extension Side
- If processing fails, panel remains in uninitialized state
- Channel is not marked ready, so subsequent messages are queued
- Logging captures errors for debugging

## Reliability Features

1. **Multiple Send Mechanisms**:
   - Normal effect when conditions are met
   - Emergency timer after 3 seconds
   - Message listener can also send if needed

2. **Auth State Resilience**:
   - `ensureAuthState()` checks localStorage as source of truth
   - Kinde token cached by Lucid platform provides immediate state

3. **Message Queuing**:
   - Extension queues messages until REACT_APP_READY received
   - Prevents lost messages during initialization

## Common Issues

1. **Race Conditions**: Solved by message queuing system
2. **Auth Delays**: Multiple fallback mechanisms ensure reliable delivery
3. **Panel Not Ready**: Emergency timer ensures message is eventually sent

## Related Messages
- **AUTH_STATUS** - Immediate response
- **SUBSCRIPTION_STATUS** - Immediate response (if authenticated)
- **SELECTION_CHANGED** - May follow for model panel