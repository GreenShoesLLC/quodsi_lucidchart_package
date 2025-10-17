# Authentication System Overview

## Introduction

The Quodsi authentication system is a comprehensive solution that enables user authentication within the Quodsi application ecosystem. This document provides an overview of the system architecture, key components, and authentication flow to help developers understand and work with the codebase.

## Architecture Overview

The Quodsi authentication system spans multiple components:

1. **Microsoft Entra ID (Azure AD B2C)**: External identity provider that handles authentication flows and user identity
2. **Quodsi Editor Extension**: LucidChart extension with AuthPanel and ModelPanel 
3. **Quodsi React Application**: Embedded within the extension panels, handles login UI and authentication logic
4. **FastAPI Backend**: Manages user database, sessions, and authentication validation
5. **Quodsi Database**: Stores user information, sessions, and audit logs

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

## Authentication Flow

The high-level authentication flow is:

1. User clicks "Sign In" in AuthPanel
2. React app initiates MSAL authentication popup
3. User authenticates with Microsoft Entra ID
4. Token is returned to React app
5. React app synchronizes user with FastAPI backend
6. FastAPI creates/updates user in database
7. React app establishes session and updates UI
8. Authentication state is persisted and shared between panels

## Key Components

### Extension Components

1. **AuthPanel.ts**
   - Purpose: Manages the authentication panel lifecycle and state persistence
   - Key features:
     - Session storage management for auth state persistence
     - Consolidated message handling for auth events
     - Session timeout monitoring

2. **ModelPanel.ts**
   - Purpose: Manages the model editing panel and checks authentication status
   - Key features:
     - Authentication status checking
     - "Requires Authentication" message display when not authenticated
     - Redirection to AuthPanel for authentication

### React Components

1. **AuthProvider.tsx**
   - Purpose: Context provider for authentication state and functions
   - Features:
     - React context for auth state management
     - Integration with MSAL library
     - API service initialization with token management

2. **Authentication Hooks**
   - Purpose: Modular specialized hooks for authentication
   - Components:
     - `useAuthState.ts` - Manages core authentication state
     - `useTokenManager.ts` - Handles token acquisition and refresh
     - `useAuthOperations.ts` - Implements sign-in/sign-out functions
     - `useAuthSession.ts` - Manages session state and timeout detection
     - `useBackendSync.ts` - Handles synchronization with FastAPI backend

### FastAPI Components

1. **auth.py**
   - Purpose: Authentication API endpoints
   - Key endpoints:
     - Token validation
     - User synchronization
     - Session management

2. **user_service.py**
   - Purpose: User management service
   - Key features:
     - User creation from token
     - User profile synchronization
     - Login statistics tracking

3. **session_service.py**
   - Purpose: Session management service
   - Key features:
     - Session creation and tracking
     - Activity tracking
     - Session termination

## Database Schema

The database includes the following key tables for authentication:

1. **User**
   - Base user information (id, email, display_name)
   - Identity provider details (provider, provider_id)
   - Status and timestamps

2. **UserSession**
   - Session tracking (id, user_id, start_time, end_time)
   - Client information (user_agent, IP address)
   - Activity timestamps

3. **AuditLog**
   - Security event logging
   - Authentication event recording
   - User action tracking

4. **UserUsageStats**
   - Usage statistics for analytics and billing
   - Daily aggregated metrics
   - Feature usage tracking

## iFrame Considerations

Authentication in iframe environments presents challenges that the system addresses:

1. **Third-party cookie restrictions**: Uses popup-based authentication
2. **X-Frame-Options headers**: Handles authentication outside the iframe context
3. **Cross-origin restrictions**: Uses postMessage for secure communication
4. **State persistence**: Implements robust session storage management
5. **Popup window handling**: Proper handling of popup windows from iframes
