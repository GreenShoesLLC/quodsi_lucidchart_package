# Quodsi Authentication System Documentation

## Overview

The Quodsi Authentication System is a comprehensive solution that enables user authentication within a Lucidchart extension environment. This document provides an overview of the system architecture, key components, and implementation details to help new developers understand and work with the codebase.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Microsoft Entra ID Integration](#microsoft-entra-id-integration)
3. [Key Authentication Components](#key-authentication-components)
4. [Authentication Flow](#authentication-flow)
5. [Consolidated Messaging System](#consolidated-messaging-system)
6. [iFrame Considerations](#iframe-considerations)
7. [Session Management](#session-management)
8. [Panel Visibility and Authentication](#panel-visibility-and-authentication)
9. [Panel Initialization Sequence](#panel-initialization-sequence)
10. [Troubleshooting](#troubleshooting)
11. [Further Development](#further-development)

## Architecture Overview

The Quodsi authentication system spans multiple projects and integrates with Microsoft Entra ID (formerly Azure AD B2C) for identity management. The system consists of three main components:

1. **Extension Host (quodsi_editor_extension)**: Manages the Lucidchart panel lifecycle and persists authentication state
2. **React Application (quodsim-react)**: Provides the user interface and handles authentication flows
3. **Shared Library (@quodsi/shared)**: Contains common types and messaging infrastructure
4. **Backend API (quodsi-fastapi)**: Handles user synchronization, session management, and activity tracking

The authentication is based on the following principles:
- User authentication is handled via Microsoft Entra ID (Azure AD B2C)
- Authentication state is maintained in session storage for persistence
- Communication between components uses a consolidated messaging system
- Each panel checks authentication status independently when accessed
- User sessions are tracked in the backend for analytics and security auditing

## Microsoft Entra ID Integration

### App Registrations

The system uses two Azure app registrations:

1. **Quodsi Frontend SPA (Dev)**
   - App ID: `71597220-4889-4c06-8c08-152dfae2082b`
   - Purpose: Handles user authentication from the client-side
   - Type: Single-page application (SPA)
   - Authentication flow: PKCE OAuth 2.0

2. **Quodsi Backend API (Dev)**
   - App ID: `416d06b1-296b-419a-8180-4cabf8f15ecf`
   - Purpose: Secures the backend API
   - Identifier URI: `https://quodsidevb2c.onmicrosoft.com/api`
   - Authentication: Token-based

### User Flows

The system implements three primary user flows:

1. **Sign-in/Sign-up**: Combined flow that allows new users to register or existing users to sign in
2. **Profile Edit**: Allows authenticated users to modify their profile information
3. **Password Reset**: Enables users to reset their password if forgotten

These flows are configured in the Microsoft Entra ID B2C tenant and referenced in the application's authentication configuration.

## Key Authentication Components

### Extension Components

1. **AuthPanel.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\AuthPanel.ts`
   - Purpose: Manages the authentication panel lifecycle and state persistence
   - Key features:
     - Session storage management for auth state persistence with fallbacks
     - Consolidated message handling for auth events
     - Session timeout monitoring
     - Processing authentication data from REACT_APP_READY messages

2. **extension.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\extension.ts`
   - Purpose: Initializes extension components including auth and model panels
   - Shows both panel icons regardless of authentication state
   - Contains handlers for panel navigation messages

### React Components

1. **msalSetup.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\msalSetup.ts`
   - Purpose: MSAL initialization and configuration
   - Features:
     - Creates a configured MSAL instance
     - Sets up event handlers for authentication events
     - Properly separates initialization from redirect handling

2. **MsalInitializer.tsx**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\components\MsalInitializer.tsx`
   - Purpose: Ensures MSAL is properly initialized before rendering child components
   - Features:
     - Proper initialization sequence
     - Handles redirect responses after initialization is complete
     - Loading and error states during initialization

3. **AuthProvider.tsx**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\AuthProvider.tsx`
   - Purpose: Context provider for authentication state and functions
   - Features:
     - React context for auth state management
     - Integration with MSAL library
     - API service initialization with token management

4. **Authentication Hooks**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\auth\`
   - Purpose: Modular specialized hooks for authentication following Single Responsibility Principle
   - Components:
     - `useAuthState.ts` - Manages core authentication state (isAuthenticated, userInfo, etc.)
     - `useTokenManager.ts` - Handles token acquisition, validation, and refresh
     - `useAuthOperations.ts` - Implements sign-in, sign-out, password reset functions
     - `useAuthSession.ts` - Manages session state, timeout detection, and activity tracking
     - `useBackendSync.ts` - Handles synchronization with quodsi-fastapi backend

5. **QuodsiApp.tsx**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\QuodsiApp.tsx`
   - Purpose: Main React application component that handles panel rendering and state
   - Features:
     - Panel type detection and switching
     - Authentication state management
     - Model initialization state tracking
     - Handles transitions between different UI states
     - Sends authentication data with REACT_APP_READY messages for immediate state synchronization

6. **authMessageHandlers.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\services\messageHandlers\auth\authMessageHandlers.ts`
   - Purpose: Handles authentication-related messages using consolidated approach
   - Features:
     - Single handler for all authentication actions
     - Action type-based routing for different auth operations
     - State updates based on auth events
     - Enhanced panel initialization detection

### Shared Components

1. **MessageTypes.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\MessageTypes.ts`
   - Purpose: Defines message types for extension-React communication
   - Auth-related message types:
     - `AUTH` - Consolidated message type for all auth operations
     - `REACT_APP_READY` - Now includes authentication data for early state synchronization

2. **AuthPayloads.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads\AuthPayloads.ts`
   - Purpose: Type definitions for auth message payloads
   - Features:
     - `AuthActionType` enum for different auth operations
     - Consolidated payload structure with action-type discrimination
     - Typed data for different auth operations
     - `AuthData` interface used by both AUTH and REACT_APP_READY messages

## Authentication Flow

The authentication process follows these steps:

1. **Initialization**:
   - The extension initializes both AuthPanel and ModelPanel
   - Both panels are shown in the Lucidchart panel selector
   - MSAL is properly initialized before any authentication operations
   - Initialization sequence ensures MSAL functions are called in proper order
   - React app now shares authentication state via REACT_APP_READY message

2. **User Authentication**:
   - User clicks "Sign In" button in AuthPanel
   - React app sends `AUTH` message with `SIGN_IN` action type
   - MSAL authentication is triggered with popup
   - User completes authentication in Microsoft Entra ID
   - Token is acquired and stored

3. **Backend Synchronization**:
   - User information is synchronized with the backend (quodsi-fastapi)
   - A user session is created in the backend
   - Session activity is tracked periodically

4. **State Persistence**:
   - Authentication state is stored in session storage with fallbacks
   - Auth status is sent to the extension via `AUTH` message with `COMPLETED` action type
   - Extension updates its internal state and broadcasts status

5. **Panel Reopening**:
   - When panel is closed and reopened, authentication state is retrieved from storage
   - React app is initialized with correct panel type
   - Authentication state is restored from both session storage and REACT_APP_READY payload
   - Backend session is updated

6. **Sign-out Flow**:
   - User clicks "Sign Out" button
   - React app sends `AUTH` message with `SIGN_OUT` action type
   - Backend session is ended
   - Popup-based logout ensures proper session termination
   - React app clears tokens and session state
   - Proper redirect URIs ensure post-logout navigation

7. **Panel Authentication Check**:
   - When ModelPanel is opened, it immediately receives authentication state via REACT_APP_READY
   - If not authenticated, it shows a message with a sign-in button
   - Sign-in button sends `AUTH` message with `SHOW_PANEL` action type
   - After successful authentication, ModelPanel shows content on next access

## Consolidated Messaging System

The Quodsi authentication system has been refactored to use a consolidated messaging approach:

### Key Changes

1. **Single Message Type**:
   - All auth-related messages now use the single `AUTH` message type
   - The previous separate message types (`AUTH_PANEL_INIT`, `AUTH_STATUS_REQUEST`, etc.) have been replaced

2. **Action Type Discrimination**:
   - The `AUTH` message payload includes an `type` field of type `AuthActionType`
   - This field is used to determine the specific auth operation being performed

3. **Unified Payload Structure**:
   - The `AUTH` message payload has a standardized structure:
     ```typescript
     {
       type: AuthActionType;
       data?: {
         // Operation-specific data
       }
     }
     ```

4. **Consolidated Handlers**:
   - Both the extension and React app use a single message handler for all auth operations
   - The handler uses a switch statement on the `type` field to route to specific operation handlers

5. **Early Authentication State Sharing**:
   - REACT_APP_READY message now includes authentication data
   - Both panels receive authentication state immediately when React initializes
   - Eliminates dependency on panel initialization order
   - Ensures consistent authentication state across panels

### Auth Action Types

The `AuthActionType` enum defines all possible authentication operations:

```typescript
export enum AuthActionType {
    PANEL_INIT = 'panelInit',
    STATUS_REQUEST = 'statusRequest',
    STATUS_RESPONSE = 'statusResponse',
    SIGN_IN = 'signIn',
    SIGN_OUT = 'signOut',
    COMPLETED = 'completed',
    ERROR = 'error',
    SHOW_PANEL = 'showPanel',
    MODEL_PANEL_FOCUS = 'modelPanelFocus'
}
```

## iFrame Considerations

Working with authentication in iframe environments presents several challenges that the Quodsi authentication system addresses:

### Challenges in iFrame Authentication

1. **Third-party cookie restrictions**: Modern browsers restrict cookies in iframes
2. **X-Frame-Options headers**: Many identity providers block embedding in iframes
3. **Cross-origin restrictions**: Communication between frames may be limited
4. **State persistence**: iFrame reloads can cause state loss
5. **Popup window handling**: Popup windows from iframes face additional security constraints
6. **Separate JavaScript Contexts**: Each iframe has its own isolated JavaScript execution environment

### Solutions Implemented

1. **Popup Authentication**: 
   - Uses popup-based authentication rather than redirect flow
   - Avoids issues with third-party cookies in iframes
   - Implemented in `useAuthOperations.ts` with `loginPopup` and `logoutPopup`

2. **Session Storage with Fallbacks**:
   - Robust session state persistence with multiple fallback approaches
   - Handles cases where sessionStorage might not be directly accessible
   - Uses window.sessionStorage with feature detection and error handling

3. **Proper MSAL Initialization Sequence**:
   - Correctly separates MSAL initialization from redirect handling
   - Ensures initialize() is called and awaited before using any MSAL APIs
   - Prevents "uninitialized_public_client_application" errors

4. **Consistent Redirect URIs**:
   - Uses the same redirect URI determination logic for both login and logout
   - Properly configures post-logout redirect URIs
   - Ensures smooth navigation after authentication operations

5. **Enhanced Error Handling**:
   - Detailed error messages for authentication failures
   - Proper error state display in UI
   - Provides recovery options when possible

6. **Early Authentication State Sharing**:
   - REACT_APP_READY includes authentication state as soon as React initializes
   - Avoids race conditions and timing issues with separate iframes
   - Each panel updates its local state from shared authentication data

## Session Management

The authentication system implements robust session management:

1. **Client-side Session Management**:
   - Handled with robust fallbacks for various browser environments
   - Session storage access with feature detection and error handling
   - Multiple layers of fallback for storage API access
   - 30-minute inactivity timeout for security

2. **Proper Token Management**:
   - Secure token handling with proper scope and security settings
   - Appropriate error handling for token acquisition failures
   - Popup-based authentication for more reliable token acquisition in iframes

3. **Cross-Panel Communication**:
   - Synchronized authentication state between panels
   - Consolidated messaging system for cleaner communication
   - AUTH status messages to keep panels in sync
   - REACT_APP_READY message now includes authentication state

## Panel Visibility and Authentication

The system implements a user-friendly approach to panel visibility and authentication:

1. **Always Visible Panel Icons**:
   - Both AuthPanel and ModelPanel icons are always visible in the Lucidchart panel selector
   - This provides a consistent UI experience for users

2. **Authentication-Based Content**:
   - Each panel is responsible for checking authentication status
   - ModelPanel shows authentication message if user is not authenticated
   - Content is only shown when authenticated

3. **Panel Redirection**:
   - ModelPanel provides a sign-in button when user is not authenticated
   - This button sends `AUTH` message with `SHOW_PANEL` action type to activate the AuthPanel
   - After authentication, ModelPanel can be accessed with content

## Panel Initialization Sequence

The system now properly handles panel initialization regardless of the order in which panels are opened:

1. **Proper Panel Type Detection**:
   - QuodsiApp detects which panel it's running in
   - Sets panel type based on URL or path information
   - Maintains panel type through page reloads

2. **Early Authentication State Sharing**:
   - QuodsiApp immediately shares authentication state via REACT_APP_READY
   - Both panels receive this information as soon as their React instances initialize
   - This eliminates dependency on panel initialization order
   - Authentication state is consistent regardless of which panel was opened first

3. **ModelPanel Initialization State**:
   - When ModelPanel is opened, it immediately knows authentication state
   - If authenticated, it checks if a model exists
   - If no model exists or model needs initialization, it shows initialization UI
   - Provides clear "Initialize Quodsi Model" button rather than infinite loading
   - Tracks initialization state to prevent stuck loading indicators

4. **AuthPanel First, ModelPanel Second**:
   - When AuthPanel is opened first, authentication state is established
   - When ModelPanel is subsequently opened, it receives authentication state immediately
   - Shows appropriate UI based on model and authentication state
   - Handles transitions between different states cleanly

5. **MSAL Initialization Sequence**:
   - MSAL is properly initialized before any authentication operations
   - Clear separation between initialization and redirect handling
   - Prevent race conditions in authentication operations

6. **Improved Loading States**:
   - Clear loading indicators during initialization
   - Timeouts to prevent infinite loading states
   - User-friendly messages during loading

## Troubleshooting

Common authentication issues and their solutions:

1. **MSAL Initialization Errors**:
   - Look for "[MSAL] Redirect authentication error: BrowserAuthError: uninitialized_public_client_application"
   - This indicates MSAL functions are being called before initialization is complete
   - Ensure proper sequence in MsalInitializer.tsx - initialize() must be awaited before any other MSAL calls

2. **Session Storage Issues**:
   - Look for "[AuthPanel] Error loading session state" or "sessionStorage is not defined"
   - This indicates the storage API isn't available in the current context
   - Use the enhanced sessionStorage handling with fallbacks

3. **Panel Initialization Problems**:
   - ModelPanel shows "Initializing..." indefinitely
   - Check if REACT_APP_READY message includes authentication data
   - Verify both panels handle authentication data in REACT_APP_READY correctly
   - Ensure ModelPanel always sends its authentication status in handleReactReady

4. **Logout Redirect Problems**:
   - 404 errors after logout
   - Check that consistent redirect URI logic is being used
   - Ensure the getRedirectUri function is used for both login and logout
   - Verify redirect URIs include the full path to the application entry point

5. **Authentication State Persistence Issues**:
   - Session not remembered between panel reopening
   - Check the sessionStorage implementation with fallbacks
   - Verify storage keys match between save and load operations
   - Ensure REACT_APP_READY is properly sending authentication data

## Further Development

Areas for potential enhancement:

1. **Enhanced Security**:
   - Implement token encryption in session storage
   - Add additional security headers for iframe protection

2. **Improved User Experience**:
   - Add "Remember Me" functionality
   - Implement silent authentication where possible

3. **Role-Based Access Control**:
   - Expand authentication to include role management
   - Implement feature toggling based on user roles

4. **Multi-tenant Support**:
   - Extend authentication to support multiple Microsoft Entra ID tenants
   - Implement tenant selection during sign-in

5. **Authentication Hook Improvements**:
   - Add comprehensive unit tests for all specialized hooks
   - Add additional performance optimizations
   - Enhance error handling with more detailed error states

6. **Message Handling Enhancements**:
   - Add more robust error handling for malformed messages
   - Implement message validation middleware
   - Add message tracking and debugging capabilities

7. **Separate Panel React Apps**:
   - Consider creating separate React applications for each panel
   - This would make the separation of concerns even clearer
   - Would eliminate issues with shared state between panels

---

This documentation provides a comprehensive overview of the updated Quodsi authentication system with the consolidated messaging approach and enhanced authentication state sharing. For more detailed information, refer to the specific code files mentioned in the [Key Authentication Components](#key-authentication-components) section.
