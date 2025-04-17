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
7. [Troubleshooting](#troubleshooting)
8. [Further Development](#further-development)

## Architecture Overview

The Quodsi authentication system spans multiple projects and integrates with Microsoft Entra ID (formerly Azure AD B2C) for identity management. The system consists of three main components:

1. **Extension Host (quodsi_editor_extension)**: Manages the Lucidchart panel lifecycle and persists authentication state
2. **React Application (quodsim-react)**: Provides the user interface and handles authentication flows
3. **Shared Library (@quodsi/shared)**: Contains common types and messaging infrastructure

The authentication is based on the following principles:
- User authentication is handled via Microsoft Entra ID (Azure AD B2C)
- Authentication state is maintained in session storage for persistence
- Communication between components uses a messaging system
- Authentication status affects the visibility of other extension panels

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
     - Panel visibility control based on auth state
     - Session timeout monitoring

2. **extension.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\extension.ts`
   - Purpose: Initializes extension components including auth and model panels
   - Coordinates panel visibility based on authentication state

### React Components

1. **AuthProvider.tsx**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\AuthProvider.tsx`
   - Purpose: Context provider for authentication state and functions
   - Features:
     - React context for auth state management
     - Integration with MSAL library
     - API service initialization with token management

2. **useAuthentication.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\useAuthentication.ts`
   - Purpose: Custom hook for handling authentication logic
   - Features:
     - Token acquisition and refresh
     - Auth state management
     - Sign-in/sign-out handlers
     - Error handling

3. **authConfig.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\authConfig.ts`
   - Purpose: Configuration for MSAL authentication
   - Contains:
     - Authority URLs
     - Client ID
     - Redirect URIs
     - Authentication scopes

4. **AuthPanel.tsx**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\auth\AuthPanel.tsx`
   - Purpose: UI component for authentication interactions
   - Features:
     - Sign-in/sign-out buttons
     - Profile management
     - Error display

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

2. **AuthPayloads.ts**
   - Location: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads\AuthPayloads.ts`
   - Purpose: Type definitions for auth message payloads

## Authentication Flow

The authentication process follows these steps:

1. **Initialization**:
   - The extension initializes both AuthPanel and ModelPanel
   - Initially, only AuthPanel is visible
   - ModelPanel visibility is controlled by authentication state

2. **User Authentication**:
   - User clicks "Sign In" button in AuthPanel
   - React app triggers MSAL authentication with popup
   - User completes authentication in Microsoft Entra ID
   - Token is acquired and stored

3. **State Persistence**:
   - Authentication state is stored in session storage
   - Auth status is sent from React to extension
   - Extension updates its internal state and panel visibility

4. **Panel Reopening**:
   - When panel is closed and reopened, authentication state is retrieved from storage
   - React app is initialized with correct panel type
   - Authentication state is restored

5. **Sign-out Flow**:
   - User clicks "Sign Out" button
   - React app clears tokens and sends sign-out message
   - Extension clears session storage and updates panel visibility

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
   - Implemented in `useAuthentication.ts` with `loginPopup` and `logoutPopup`

2. **Session Storage for State**:
   - Session state persisted in browser storage
   - Allows state to survive panel reopening
   - Implemented in `AuthPanel.ts` with session storage methods

3. **Message-based Communication**:
   - Uses `postMessage` for cross-frame communication
   - Ensures stable communication despite iframe constraints
   - Implemented in `ExtensionMessaging` class

4. **Frame Reinitialize Handling**:
   - Special handling when iframe is reloaded
   - Ensures authentication state is properly restored
   - Implemented in `frameLoaded` and `handleReactReady` methods

## Session Management

The authentication system implements robust session management:

1. **Session Timeout**:
   - 30-minute inactivity timeout
   - Configurable via `SESSION_TIMEOUT` constant in `AuthPanel.ts`
   - Periodically checks for timeout and forces re-login if needed

2. **Token Refresh**:
   - Automatic token refresh before expiration
   - Implemented in `refreshTokenIfNeeded` in `useAuthentication.ts`
   - Refreshes tokens 5 minutes before expiration

3. **Session Storage Keys**:
   - `quodsi_auth_state`: Boolean indicating authenticated state
   - `quodsi_user_info`: User profile information
   - `quodsi_last_active`: Timestamp for session activity tracking

## Troubleshooting

Common authentication issues and their solutions:

1. **Authentication state lost after panel reopening**:
   - Ensure the `frameLoaded` method in `AuthPanel.ts` is properly sending initialization messages
   - Check that session storage is being correctly accessed

2. **Popup authentication fails**:
   - Verify popup blockers are disabled
   - Ensure the app registration in Microsoft Entra ID has the correct redirect URIs

3. **Token refresh issues**:
   - Check for console errors related to token acquisition
   - Verify the permissions and scopes in the app registration

4. **Incorrect panel shown after authentication**:
   - Ensure `panelType` is being correctly set in `QuodsiApp.tsx`
   - Verify message handlers for panel initialization

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

---

This documentation provides a comprehensive overview of the Quodsi authentication system. For more detailed information, refer to the specific code files mentioned in the [Key Authentication Components](#key-authentication-components) section.
