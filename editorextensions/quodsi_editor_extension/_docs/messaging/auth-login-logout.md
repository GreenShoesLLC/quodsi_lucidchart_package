# Authentication Login/Logout Exchange

## Overview
Authentication messages handle user login and logout flows, synchronizing authentication state across all panels.

## Message Flow

### AUTH_LOGIN_SUCCESS: React → Extension

**Direction:** React → Extension  
**Purpose:** Notify extension of successful user authentication  
**Auth Required:** No (initiates authentication)  

**Payload:**
```typescript
{
  idToken: string,
  user: UserInfo,
  newUser: boolean
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/authSender.ts`
- Function: `useAuthSender.sendLoginSuccess`

**Handler:**
- File: `src/core/messaging/handlers/authHandler.ts`
- Function: `AuthHandler.handleLoginSuccess`

**Response:** `AUTH_STATUS` (broadcast to all panels)

---

### AUTH_LOGOUT: React → Extension

**Direction:** React → Extension  
**Purpose:** Signal user logout, clear authentication state  
**Auth Required:** Yes  

**Payload:**
```typescript
{} // Empty payload
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/authSender.ts`
- Function: `useAuthSender.sendLogout`

**Handler:**
- File: `src/core/messaging/handlers/authHandler.ts`
- Function: `AuthHandler.handleLogout`

**Response:** `AUTH_STATUS` (with isAuthenticated: false)

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| AUTH_LOGIN_SUCCESS | ✅ useAuthSender.sendLoginSuccess | ✅ AuthHandler.handleLoginSuccess | ➖ N/A | ➖ N/A |
| AUTH_LOGOUT | ✅ useAuthSender.sendLogout | ✅ AuthHandler.handleLogout | ➖ N/A | ➖ N/A |

## Login Sequence

1. User enters credentials in auth panel
2. React authenticates with MSAL identity provider
3. React saves auth state to localStorage
4. React updates local state
5. **AUTH_LOGIN_SUCCESS** sent to extension
6. Extension updates internal auth state
7. Extension broadcasts **AUTH_STATUS** to all panels
8. Extension sends **SUBSCRIPTION_STATUS** to all panels
9. Model panel becomes usable with authenticated features

## Logout Sequence

1. User clicks "Sign Out" button
2. React clears MSAL cache
3. **AUTH_LOGOUT** sent to extension
4. Extension clears internal auth state
5. Extension clears localStorage
6. Extension broadcasts **AUTH_STATUS** (isAuthenticated: false)
7. All panels update to unauthenticated state

## Implementation Details

### Login Handler (Extension)
```typescript
handleLoginSuccess(msg: EnvelopeBase): void {
    const data = msg.data as AuthLoginSuccessPayload;
    
    // Update router state
    this.state.updateAuthState({
        isAuthenticated: true,
        user: data.user,
        idToken: data.idToken
    });
    
    // Save to localStorage for persistence
    AuthStorageService.saveAuthState(true, data.user);
    
    // Broadcast to all panels
    this.router.broadcastToAllChannels(EnvelopeMessageType.AUTH_STATUS, {
        isAuthenticated: true,
        userInfo: data.user
    });
}
```

### Logout Handler (Extension)
```typescript
handleLogout(msg: EnvelopeBase): void {
    // Clear router state
    this.state.updateAuthState({
        isAuthenticated: false,
        user: undefined,
        idToken: undefined
    });
    
    // Clear localStorage
    AuthStorageService.clearAuthState();
    
    // Broadcast to all panels
    this.router.broadcastToAllChannels(EnvelopeMessageType.AUTH_STATUS, {
        isAuthenticated: false,
        userInfo: undefined
    });
}
```

## Error Handling

### Login Errors
- Multiple fallback mechanisms ensure reliable delivery
- localStorage backup provides resilience
- Direct panel access if messaging fails
- MSAL handles identity provider errors

### Logout Errors
- localStorage cleared even if other operations fail
- Ensures consistent state across system
- UI updates to unauthenticated state regardless

## Reliability Features

1. **Persistent State**: localStorage maintains auth state across sessions
2. **Multi-Panel Sync**: All panels receive auth status updates
3. **Fallback Mechanisms**: Multiple delivery paths ensure reliability
4. **Error Recovery**: System handles partial failures gracefully

## Related Messages
- **AUTH_STATUS** - Response message for both login/logout
- **SUBSCRIPTION_STATUS** - Sent after successful login
- **AUTH_REQUIRED** - May trigger login flow
- **REQUEST_AUTH_STATUS** - Can query current state