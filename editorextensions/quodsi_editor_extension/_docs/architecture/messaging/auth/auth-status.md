# Authentication Status Exchange

## Overview
Authentication status messages manage the synchronization of authentication state between the extension and React panels, including status queries and authentication requirements.

## Message Flow

### AUTH_STATUS: Extension → React

**Direction:** Extension → React  
**Purpose:** Communicate current authentication state to panels  
**Auth Required:** No  

**Payload:**
```typescript
{
  isAuthenticated: boolean,
  userInfo?: UserInfo      // { id: string, email: string, displayName: string }
}
```

**Sender:** 
- File: `src/core/messaging/MessageRouter.ts`
- Function: `MessageRouter.sendAuthStatus`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/auth.mapper.ts`
- Function: `mapAuth`

**Triggers:**
- After REACT_APP_READY
- After AUTH_LOGIN_SUCCESS
- After AUTH_LOGOUT
- In response to REQUEST_AUTH_STATUS

---

### AUTH_REQUIRED: Extension → React

**Direction:** Extension → React  
**Purpose:** Inform React that authentication is required for requested operation  
**Auth Required:** No (triggers authentication)  

**Payload:**
```typescript
{
  requestedOperation: string,      // Operation that requires auth
  redirectAfterAuth?: boolean      // Whether to retry after auth
}
```

**Sender:** 
- File: `src/core/messaging/handlers/*.ts` (various handlers)
- Function: Various handlers when auth check fails

**Handler:**
- File: `quodsim-react/src/messaging/mappers/auth.mapper.ts`
- Function: `mapAuth`

---

### REQUEST_AUTH_STATUS: React → Extension

**Direction:** React → Extension  
**Purpose:** Query current authentication state from extension  
**Auth Required:** No  

**Payload:**
```typescript
{} // Empty payload
```

**Sender:** 
- File: Various React components
- Function: When panels need to confirm auth state

**Handler:**
- File: `src/core/messaging/handlers/authHandler.ts`
- Function: `AuthHandler.handleRequestAuthStatus`

**Response:** `AUTH_STATUS`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| AUTH_STATUS | ➖ N/A | ➖ N/A | ✅ MessageRouter.sendAuthStatus | ✅ mapAuth |
| AUTH_REQUIRED | ➖ N/A | ➖ N/A | ✅ Various handlers | ✅ mapAuth |
| REQUEST_AUTH_STATUS | ✅ Various | ✅ AuthHandler.handleRequestAuthStatus | ➖ N/A | ➖ N/A |

## Typical Sequences

### Initial Panel Load
1. Panel sends REACT_APP_READY
2. Extension sends **AUTH_STATUS**
3. Panel updates UI based on auth state
4. If authenticated, shows user info
5. If not authenticated, shows login UI

### Authentication Required Flow
1. User attempts protected operation (e.g., run simulation)
2. Extension checks auth state
3. Extension sends **AUTH_REQUIRED**
4. React shows login prompt
5. After login, operation may be retried

### Status Query Flow
1. Panel needs to verify auth state
2. **REQUEST_AUTH_STATUS** sent to extension
3. Extension responds with **AUTH_STATUS**
4. Panel updates based on response

## Implementation Details

### Extension Status Sender
```typescript
sendAuthStatus(channel?: PanelRole): void {
    const authState = this.state.getAuthState();
    const payload = {
        isAuthenticated: authState.isAuthenticated,
        userInfo: authState.user
    };
    
    if (channel) {
        // Send to specific channel
        this.sendToChannel(channel, EnvelopeMessageType.AUTH_STATUS, payload);
    } else {
        // Broadcast to all channels
        this.broadcastToAllChannels(EnvelopeMessageType.AUTH_STATUS, payload);
    }
}
```

### React Status Handler
```typescript
// In auth.mapper.ts
case EnvelopeMessageType.AUTH_STATUS:
    return {
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated: data.isAuthenticated,
        userInfo: data.userInfo
    };

case EnvelopeMessageType.AUTH_REQUIRED:
    return {
        type: 'AUTH_REQUIRED',
        requestedOperation: data.requestedOperation,
        redirectAfterAuth: data.redirectAfterAuth
    };
```

### Extension Auth Check Pattern
```typescript
// Common pattern in handlers
if (!this.state.isAuthenticated()) {
    this.router.sendToChannel(
        msg.source,
        EnvelopeMessageType.AUTH_REQUIRED,
        { requestedOperation: 'runSimulation' }
    );
    return;
}
// Continue with authenticated operation...
```

## State Synchronization

### Multiple Delivery Mechanisms
1. **Direct messaging**: AUTH_STATUS sent to specific panels
2. **Broadcast**: Updates all panels simultaneously
3. **LocalStorage backup**: React persists auth state
4. **MSAL cache**: Token storage for session persistence

### State Consistency
- Extension maintains authoritative auth state
- React panels sync from extension
- LocalStorage provides fallback
- All panels receive same auth updates

## Error Handling

### Missing Auth State
- Uses localStorage as fallback source
- `ensureAuthState()` checks multiple sources
- Graceful degradation to unauthenticated state

### Network Issues
- AUTH_STATUS uses reliable delivery
- Multiple retry mechanisms
- LocalStorage provides offline capability

### Token Expiration
- MSAL handles token refresh
- Extension notified of auth changes
- Automatic AUTH_STATUS broadcast

## UI Integration

### Auth Status Effects
```typescript
// Panel shows different UI based on auth state
if (isAuthenticated) {
    // Show user info and full features
    return <AuthenticatedPanel user={userInfo} />;
} else {
    // Show login prompt
    return <LoginPanel />;
}
```

### Auth Required Handling
```typescript
// Show modal or redirect to auth panel
if (authRequired) {
    return <AuthRequiredModal 
        operation={requestedOperation}
        onLogin={() => handleLogin()}
    />;
}
```

## Reliability Features

1. **Multiple Send Triggers**: Ensures panels always have current state
2. **Fallback Sources**: LocalStorage, MSAL cache, direct query
3. **Broadcast Pattern**: All panels updated simultaneously
4. **Request/Response**: Panels can query when uncertain

## Common Issues

1. **Stale Auth State**: Solved by REQUEST_AUTH_STATUS
2. **Race Conditions**: Multiple delivery ensures eventual consistency
3. **Panel Out of Sync**: Broadcast pattern keeps all panels aligned

## Related Messages
- **REACT_APP_READY** - Triggers initial AUTH_STATUS
- **AUTH_LOGIN_SUCCESS** - Updates auth state
- **AUTH_LOGOUT** - Clears auth state
- **AUTH_ERROR** - Reports authentication failures