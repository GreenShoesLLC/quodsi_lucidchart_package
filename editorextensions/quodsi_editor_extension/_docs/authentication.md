# Quodsi Authentication System Documentation

## Overview

The Quodsi Authentication System is a comprehensive solution that enables user authentication within a Lucidchart extension environment. This document provides an overview of the system architecture, key components, and implementation details to help new developers understand and work with the codebase.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Microsoft Entra ID Integration](#microsoft-entra-id-integration)
3. [Key Authentication Components](#key-authentication-components)
4. [Authentication Flow](#authentication-flow)
5. [iFrame Considerations](#iframe-considerations)
6. [Session Management](#session-management)
7. [Panel Visibility and Authentication](#panel-visibility-and-authentication)
8. [Troubleshooting](#troubleshooting)
9. [Further Development](#further-development)

## Architecture Overview

The Quodsi authentication system spans multiple projects and integrates with Microsoft Entra ID (formerly Azure AD B2C) for identity management. The system consists of three main components:

1. **Extension Host (quodsi_editor_extension)**: Manages the Lucidchart panel lifecycle and persists authentication state
2. **React Application (quodsim-react)**: Provides the user interface and handles authentication flows
3. **Shared Library (@quodsi/shared)**: Contains common types and messaging infrastructure
4. **Backend API (quodsi-fastapi)**: Handles user synchronization, session management, and activity tracking

The authentication is based on the following principles:
- User authentication is handled via Microsoft Entra ID (Azure AD B2C)
- Authentication state is maintained in session storage for persistence
- Communication between components uses a messaging system
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
     - Session storage management for auth state persistence
     - Message handling for auth events
     - Session timeout monitoring

2. **extension.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\extension.ts`
   - Purpose: Initializes extension components including auth and model panels
   - Shows both panel icons regardless of authentication state
   - Contains handlers for panel navigation messages

### React Components

1. **AuthProvider.tsx**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\AuthProvider.tsx`
   - Purpose: Context provider for authentication state and functions
   - Features:
     - React context for auth state management
     - Integration with MSAL library
     - API service initialization with token management
     - Proper MSAL initialization handling

2. **Authentication Hooks**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\auth\`
   - Purpose: Modular specialized hooks for authentication following Single Responsibility Principle
   - Components:
     - `useAuthState.ts` - Manages core authentication state (isAuthenticated, userInfo, etc.)
     - `useTokenManager.ts` - Handles token acquisition, validation, and refresh
     - `useAuthOperations.ts` - Implements sign-in, sign-out, password reset functions
     - `useAuthSession.ts` - Manages session state, timeout detection, and activity tracking
     - `useBackendSync.ts` - Handles synchronization with quodsi-fastapi backend
     - `index.ts` - Exports all hooks for easy imports

3. **useAuthentication.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\useAuthentication.ts`
   - Purpose: Facade hook that combines specialized hooks
   - Features:
     - Maintains backward compatibility with existing components
     - Delegates to specialized hooks for specific functionality
     - Provides consistent public interface

4. **Authentication Configuration**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\config\`
   - Purpose: Modular configuration for authentication system
   - Contains:
     - `msalConfig.ts` - MSAL configuration and utility functions
     - `authPolicies.ts` - Authentication policies and scopes
     - `apiConfig.ts` - API endpoint configuration
     - `sessionConfig.ts` - Session timeout and refresh settings

5. **AuthPanel.tsx**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\auth\AuthPanel.tsx`
   - Purpose: UI component for authentication interactions
   - Features:
     - Sign-in/sign-out buttons
     - Profile management
     - Error display with recovery options
     - Loading state during MSAL initialization

6. **msalSetup.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\msalSetup.ts`
   - Purpose: MSAL initialization and configuration
   - Features:
     - Creates a configured MSAL instance
     - Sets up event handlers for authentication events

### Service Components

1. **SessionStorageService**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\services\SessionStorageService.ts`
   - Purpose: Manages authentication session persistence
   - Features:
     - Load/save authentication state
     - Session timeout detection
     - MSAL cache management

2. **AuthErrorHandler**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\services\AuthErrorHandler.ts`
   - Purpose: Standardizes error handling for authentication
   - Features:
     - Categorized error types
     - User-friendly error messages
     - Recovery action suggestions
     - Error retryability assessment

3. **UserSyncService**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\services\UserSyncService.ts`
   - Purpose: Synchronizes user data with the backend
   - Features:
     - User profile synchronization
     - Session creation and management
     - Activity tracking

4. **AuthMessagingService**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\services\AuthMessagingService.ts`
   - Purpose: Handles messaging between React and extension
   - Features:
     - Authentication status communication
     - Error reporting
     - Session state synchronization

### Shared Components

1. **MessageTypes.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\MessageTypes.ts`
   - Purpose: Defines message types for extension-React communication
   - Auth-related message types:
     - `AUTH_PANEL_INIT`
     - `AUTH_STATUS_REQUEST`
     - `AUTH_STATUS_RESPONSE`
     - `AUTH_SIGN_IN`
     - `AUTH_SIGN_OUT`
     - `AUTH_COMPLETED`
     - `AUTH_ERROR`
     - `SHOW_AUTH_PANEL`
     - `MODEL_PANEL_FOCUS`

2. **AuthPayloads.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads\AuthPayloads.ts`
   - Purpose: Type definitions for auth message payloads

## Authentication Flow

The authentication process follows these steps:

1. **Initialization**:
   - The extension initializes both AuthPanel and ModelPanel
   - Both panels are shown in the Lucidchart panel selector
   - MSAL is properly initialized before any authentication operations

2. **User Authentication**:
   - User clicks "Sign In" button in AuthPanel
   - React app triggers MSAL authentication with popup
   - User completes authentication in Microsoft Entra ID
   - Token is acquired and stored

3. **Backend Synchronization**:
   - User information is synchronized with the backend (quodsi-fastapi)
   - A user session is created in the backend
   - Session activity is tracked periodically

4. **State Persistence**:
   - Authentication state is stored in session storage via SessionStorageService
   - Auth status is sent to the extension via AuthMessagingService
   - Extension updates its internal state

5. **Panel Reopening**:
   - When panel is closed and reopened, authentication state is retrieved from storage
   - React app is initialized with correct panel type
   - Authentication state is restored
   - Backend session is updated

6. **Sign-out Flow**:
   - User clicks "Sign Out" button
   - Backend session is ended
   - React app clears tokens and sends sign-out message
   - SessionStorageService clears session state

7. **Panel Authentication Check**:
   - When ModelPanel is accessed, it checks authentication status
   - If not authenticated, it shows a message with a sign-in button
   - Sign-in button redirects to AuthPanel for authentication
   - After successful authentication, ModelPanel shows content on next access

## iFrame Considerations

Working with authentication in iframe environments presents several challenges that the Quodsi authentication system addresses:

### Challenges in iFrame Authentication

1. **Third-party cookie restrictions**: Modern browsers restrict cookies in iframes
2. **X-Frame-Options headers**: Many identity providers block embedding in iframes
3. **Cross-origin restrictions**: Communication between frames may be limited
4. **State persistence**: iFrame reloads can cause state loss
5. **Popup window handling**: Popup windows from iframes face additional security constraints

### Solutions Implemented

1. **Popup Authentication**: 
   - Uses popup-based authentication rather than redirect flow
   - Avoids issues with third-party cookies in iframes
   - Implemented in `useAuthOperations.ts` with `loginPopup` and `logoutPopup`

2. **Session Storage for State**:
   - Session state persisted in browser storage
   - Allows state to survive panel reopening
   - Implemented in `SessionStorageService` with robust error handling

3. **Message-based Communication**:
   - Uses `postMessage` for cross-frame communication
   - Ensures stable communication despite iframe constraints
   - Implemented in `AuthMessagingService` for standardized messaging

4. **Frame Reinitialize Handling**:
   - Special handling when iframe is reloaded
   - Ensures authentication state is properly restored
   - Implemented in `frameLoaded` and `handleReactReady` methods

5. **Proper MSAL Initialization**:
   - MSAL is initialized before authentication operations
   - Prevents "uninitialized_public_client_application" errors
   - Loading state shown during initialization

## Session Management

The authentication system implements robust session management:

1. **Client-side Session Management**:
   - Handled by `SessionStorageService` and `useAuthSession` hook
   - 30-minute inactivity timeout
   - Configurable via `SESSION_TIMEOUT_MS` constant in `sessionConfig.ts`
   - Periodically checks for timeout and forces re-login if needed

2. **Backend Session Tracking**:
   - Creates a session record in the backend database
   - Updates session activity periodically
   - Properly ends sessions on logout
   - Provides analytics for user activity

3. **Token Refresh**:
   - Automatic token refresh before expiration
   - Implemented in `refreshTokenIfNeeded` in `useTokenManager.ts`
   - Refreshes tokens 5 minutes before expiration (configurable via `TOKEN_REFRESH_BUFFER_MS`)

4. **Session Storage Keys**:
   - Defined in `SESSION_STORAGE_KEYS` in `sessionConfig.ts`
   - `quodsi_auth_state`: Boolean indicating authenticated state
   - `quodsi_user_info`: User profile information
   - `quodsi_last_active`: Timestamp for session activity tracking
   - `quodsi_access_token`: Current access token
   - `quodsi_token_expiration`: Token expiration timestamp

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
   - This button sends `SHOW_AUTH_PANEL` message to activate the AuthPanel
   - After authentication, ModelPanel can be accessed with content

4. **Authentication State Synchronization**:
   - Authentication state is broadcast to all panels via AuthMessagingService
   - ModelPanel checks authentication when it receives focus using `MODEL_PANEL_FOCUS` message
   - This ensures a consistent experience across panels

5. **Loading States**:
   - Loading spinners shown during MSAL initialization 
   - Prevents UI flickering and confusion during authentication

## Troubleshooting

Common authentication issues and their solutions:

1. **Authentication state lost after panel reopening**:
   - Check SessionStorageService for proper saving and loading
   - Ensure the `frameLoaded` method in `AuthPanel.ts` is properly sending initialization messages
   - Verify session storage keys match between components

2. **Popup authentication fails**:
   - Check browser console for AuthErrorHandler messages
   - Verify popup blockers are disabled
   - Ensure the app registration in Microsoft Entra ID has the correct redirect URIs

3. **Token refresh issues**:
   - Look for specific error codes from AuthErrorHandler
   - Check for console errors related to token acquisition
   - Verify the permissions and scopes in the app registration

4. **MSAL initialization errors**:
   - Ensure MSAL is properly initialized before authentication operations
   - Check for "uninitialized_public_client_application" errors in console
   - Verify that `msalInstance.initialize()` is awaited in MsalInitializer.tsx

5. **Backend integration issues**:
   - Check for validation errors in quodsi-fastapi logs
   - Verify UserSyncService is formatting requests correctly
   - Ensure token is being properly passed to backend services

6. **Panel not showing authenticated content**:
   - Ensure authentication state is being properly communicated via AuthMessagingService
   - Check that `MODEL_PANEL_FOCUS` handler is requesting updated auth status
   - Verify authentication listeners are properly registered

7. **Specialized hook integration issues**:
   - Check the console for error messages from specific hooks
   - Verify proper hook dependencies and dependency arrays
   - Ensure hooks are imported and used correctly

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

5. **MSAL Initialization Optimization**:
   - Add better error handling for MSAL initialization failures
   - Implement retry logic for intermittent initialization issues
   - Provide more detailed feedback during initialization

6. **Authentication Hook Improvements**:
   - Add comprehensive unit tests for all specialized hooks
   - Add additional performance optimizations
   - Enhance error handling with more detailed error states

7. **Hook Composition Enhancements**:
   - Add support for selective hook composition for different authentication scenarios
   - Implement conditional authentication flows based on feature flags
   - Create specialized hook presets for different authentication requirements

---

This documentation provides a comprehensive overview of the Quodsi authentication system. For more detailed information, refer to the specific code files mentioned in the [Key Authentication Components](#key-authentication-components) section.