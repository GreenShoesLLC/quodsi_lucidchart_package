# Authentication Messages

User authentication and session management messages.

## Messages

### [AUTH_STATUS](./auth-status.md)
**Direction:** Extension → React
**Purpose:** Synchronize authentication state between extension and panels

**Triggers:**
- After REACT_APP_READY
- After login/logout
- On request from React

### [AUTH_LOGIN_LOGOUT](./auth-login-logout.md)
**Direction:** React → Extension (request), Extension → React (broadcast)
**Purpose:** Handle user login and logout actions

**Flow:**
```
User clicks login → AUTH_LOGIN_SUCCESS → Extension updates state →
AUTH_STATUS broadcast → All panels update UI
```

## Auth State Management

**Extension Side:**
- RouterState maintains authoritative auth state
- Broadcasts updates to all panels
- Validates auth before protected operations

**React Side:**
- MSAL handles OAuth flows
- LocalStorage provides persistence
- mapAuth converts messages to reducer actions

## Common Workflows

**Login:**
1. User initiates login in auth panel
2. MSAL OAuth flow completes
3. AUTH_LOGIN_SUCCESS → Extension
4. Extension broadcasts AUTH_STATUS
5. All panels show authenticated UI

**Logout:**
1. User clicks logout
2. AUTH_LOGOUT → Extension
3. Extension clears auth state
4. Extension broadcasts AUTH_STATUS
5. All panels show login UI

**Auth Required:**
1. User attempts protected operation
2. Extension checks auth
3. If not authenticated: AUTH_REQUIRED → React
4. React shows login prompt

## Integration

- **Extension:** `AuthHandler`, `MessageRouter.sendAuthStatus()`
- **React:** `mapAuth`, auth reducers, MSAL hooks
