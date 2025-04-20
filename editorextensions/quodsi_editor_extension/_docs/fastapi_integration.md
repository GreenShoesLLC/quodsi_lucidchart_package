# Quodsi FastAPI Integration

This document outlines the integration between quodsi_editor_extension and quodsi-fastapi for user management and authentication.

## Overview

The integration enables the following functionality:

1. User creation/synchronization in the quodsi-fastapi database when a user authenticates with Microsoft Entra ID in the editor extension
2. (Future) Session management and activity tracking
3. (Future) Enhanced user profile management

## Implementation Approach

The integration follows a progressive approach, implementing features in small steps:

### Phase 1: User Synchronization (Current)

When a user authenticates successfully with Microsoft Entra ID in the quodsi_editor_extension, the authentication token is sent to quodsi-fastapi to create or update the user in its database.

Files created/modified:

- `QuodsiFastApiService.ts` - Service for communicating with quodsi-fastapi
- `apiConfig.ts` - Configuration for quodsi-fastapi endpoints
- `useAuthentication.ts` - Updated to include user synchronization
- `AuthProvider.tsx` - Updated to expose user synchronization

### Phase 2: Session Management (Planned)

- Track user sessions in quodsi-fastapi
- Monitor user activity for analytics
- Implement session timeout handling

### Phase 3: Enhanced User Management (Planned)

- Retrieve and update user profile information
- Implement role-based access control
- Support organization/team management

## Configuration

The integration uses environment variables to configure the quodsi-fastapi URL:

```
# .env file
REACT_APP_QUODSI_FASTAPI_URL=http://localhost:8000
```

Copy `.env.sample` to `.env` and update with the appropriate URL for your environment.

## Testing

To test the integration:

1. Start quodsi-fastapi locally or connect to a test instance
2. Configure the URL in the `.env` file
3. Run the quodsi_editor_extension
4. Sign in with Microsoft Entra ID
5. Check the quodsi-fastapi logs and database to verify user creation

## Troubleshooting

Common issues:

1. **CORS Errors**: Ensure quodsi-fastapi has CORS configured to allow requests from the quodsi_editor_extension domain
2. **Token Validation Errors**: Check that quodsi-fastapi is correctly configured to validate tokens from the same Microsoft Entra ID tenant
3. **Environment Configuration**: Verify the REACT_APP_QUODSI_FASTAPI_URL is correctly set in the `.env` file

## Next Steps

1. Add comprehensive error handling for network issues
2. Implement session creation and management
3. Add user profile synchronization
4. Enable role-based access control
