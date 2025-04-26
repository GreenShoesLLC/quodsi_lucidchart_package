# Bug Fix Plan: New User Creation in Quodsi Database

## Bug Description

**Issue:** Creating a new Quodsi account via Microsoft Entra ID does not create a corresponding user record in the Quodsi database using the FastAPI backend.

**Impact:** New users can authenticate via Microsoft Entra ID but don't have a user record in the Quodsi database, preventing them from using application features that rely on database user records.

## Fix Implementation Steps Summary

1. **Enhanced Logging**: Add detailed logging to pinpoint failure points
2. **Improved Transaction Handling**: Ensure proper database transaction management
3. **Token Validation Improvements**: Add better error handling for token validation  
4. **Error Reporting Enhancement**: Improve error reporting in the UI
5. **Testing Protocol**: Add end-to-end testing for user creation flow

## Root Cause Analysis

After reviewing the code, I've identified several potential issues that could be causing this bug:

1. **Token Validation Issues**: 
   - The token from Microsoft Entra ID might not be properly validated by the FastAPI backend
   - The token might be missing required claims for user creation

2. **Error Handling Issues**:
   - Silent failures in the user creation process in `user_service.py`
   - Exceptions during user creation might be caught but not properly reported

3. **API Communication Issues**:
   - The React application might not be sending the token correctly to the FastAPI backend
   - Network issues or CORS problems could be preventing successful API calls

4. **Database Transaction Issues**:
   - The user creation transaction might be rolling back due to constraint violations
   - Database permissions might be preventing user creation

## Fix Implementation Plan

### Step 1: Enhanced Logging

First, we need to add more detailed logging to pinpoint the exact failure point.

#### React Application Changes

**File:** `useBackendSync.ts`
```typescript
// Enhanced logging for token sync
const syncUserWithBackend = useCallback(async (): Promise<UserSyncResponse | null> => {
  if (!isAuthenticated) {
    console.warn('[useBackendSync] Cannot sync user - not authenticated');
    return null;
  }
  
  // Get token
  const token = await getAccessToken();
  if (!token) {
    console.warn('[useBackendSync] Cannot sync user - no token available');
    return null;
  }
  
  try {
    console.log('[useBackendSync] Syncing user with quodsi-fastapi');
    
    // Log token information (redacted)
    const tokenParts = token.split('.');
    if (tokenParts.length >= 2) {
      try {
        const tokenPayload = JSON.parse(atob(tokenParts[1]));
        // Log token payload with sensitive data redacted
        console.log('[useBackendSync] Token payload (redacted):', {
          aud: tokenPayload.aud,
          iss: tokenPayload.iss,
          exp: tokenPayload.exp,
          sub: tokenPayload.sub ? '***redacted***' : 'missing',
          name: tokenPayload.name ? '***redacted***' : 'missing',
          preferred_username: tokenPayload.preferred_username ? '***redacted***' : 'missing',
          // Add other fields as needed
        });
      } catch (e) {
        console.error('[useBackendSync] Error parsing token payload:', e);
      }
    }
    
    const syncResponse = await userSyncService.syncUser(token);
    
    // Rest of the function unchanged
    // ...
  }
  // ...
});
```

**File:** `UserSyncService.ts`
```typescript
/**
 * Sync user information with quodsi-fastapi
 * This creates or updates the user in the quodsi-fastapi database
 */
public async syncUser(token: string): Promise<UserSyncResponse | null> {
  if (!token) {
    console.error('[UserSyncService] Cannot sync user: No token provided');
    return null;
  }

  try {
    console.log('[UserSyncService] Syncing user with quodsi-fastapi');
    console.log(`[UserSyncService] Using API endpoint: ${this.baseUrl}${authApiConfig.endpoints.syncUser}`);
    
    const response = await fetch(
      `${this.baseUrl}${authApiConfig.endpoints.syncUser}`, 
      {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({
          // The token already contains all necessary user information
          // No additional data needed for basic sync
        })
      }
    );

    // Log the response status and headers
    console.log(`[UserSyncService] Response status: ${response.status}`);
    console.log(`[UserSyncService] Response headers:`, Object.fromEntries([...response.headers.entries()]));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[UserSyncService] Failed to sync user with quodsi-fastapi', 
        `Status: ${response.status}`, 
        errorText
      );
      throw new Error(`Sync failed with status ${response.status}: ${errorText}`);
    }

    const userData: UserSyncResponse = await response.json();
    console.log('[UserSyncService] User synced successfully', userData);
    return userData;
  } catch (error) {
    // Create a standardized error and include original error details
    const authError = authErrorHandler.createUserSyncError(error);
    console.error('[UserSyncService] Error syncing user', authError, error);
    
    // Log network errors specifically
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('[UserSyncService] Network error - check API connectivity and CORS settings');
    }
    return null;
  }
}
```

#### FastAPI Changes

**File:** `auth.py` (endpoints)
```python
@router.post("/sync", response_model=UserResponse)
async def sync_user(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Synchronize user information from the identity provider to the database.

    This endpoint extracts user information from the token and updates the user
    record in the database. It can be used to force a refresh of user data.
    """
    user_service = UserService(db)
    audit_repo = AuditLogRepository(db)

    # Get the token from the Authorization header
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header:
        token = auth_service.get_token_from_header(auth_header)
        logger.info(f"Token extracted from Authorization header: {token[:20]}...")
    else:
        logger.warning("No Authorization header found in sync request")

    if not token:
        # Use current authenticated user
        logger.info(
            f"No token provided for sync, using current user: {current_user.id}"
        )
        audit_repo.log_auth_event(
            user_id=current_user.id,
            action="sync_user",
            status="success",
            ip_address=request.client.host,
            user_agent=request.headers.get("User-Agent"),
            details={"method": "current_user"},
        )
        return current_user

    try:
        # Verify the token
        logger.info("Verifying token for user sync")
        token_data = await auth_service.verify_token(token)
        logger.info(f"Token validated successfully for subject: {token_data.sub}")
        
        # Log token fields (excluding sensitive data)
        logger.info(f"Token fields: iss={token_data.iss}, aud={token_data.aud}, exp={token_data.exp}")
        logger.info(f"User fields: sub={token_data.sub}, name={bool(token_data.name)}, "
                    f"preferred_username={bool(token_data.preferred_username)}")

        # Try to sync the user
        logger.info(f"Attempting to get or create user from token for subject: {token_data.sub}")
        user = user_service.get_or_create_user_from_token(token_data)

        if user:
            logger.info(f"User found/created successfully: {user.id}")
            # Sync user data with token info
            updated_user = user_service.sync_user_data(user.id, token_data)

            audit_repo.log_auth_event(
                user_id=user.id,
                action="sync_user",
                status="success",
                ip_address=request.client.host,
                user_agent=request.headers.get("User-Agent"),
                details={
                    "provider": "entra_id",
                    "provider_id": token_data.sub,
                },
            )

            return updated_user or user
        else:
            # Failed to create or find the user
            logger.error(
                f"Failed to find or create user for sync. Provider ID: {token_data.sub}. "
                f"Name: {token_data.name or token_data.preferred_username or 'Unknown'}"
            )

            audit_repo.log_auth_event(
                user_id=current_user.id if current_user else None,
                action="sync_user",
                status="failed",
                ip_address=request.client.host,
                user_agent=request.headers.get("User-Agent"),
                details={
                    "error": "Failed to find or create user",
                    "provider": "entra_id",
                    "provider_id": token_data.sub,
                },
            )

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Failed to find or create user from token",
            )

    except JWTError as e:
        # Log the error
        logger.error(f"JWT validation error during sync: {str(e)}")
        audit_repo.log_auth_event(
            user_id=current_user.id,
            action="sync_user",
            status="failed",
            ip_address=request.client.host,
            user_agent=request.headers.get("User-Agent"),
            details={"error": str(e)},
        )

        # Return current user
        return current_user
    except Exception as e:
        # Log any other unexpected errors
        logger.error(f"Unexpected error during user sync: {str(e)}", exc_info=True)
        audit_repo.log_auth_event(
            user_id=current_user.id if current_user else None,
            action="sync_user",
            status="failed",
            ip_address=request.client.host,
            user_agent=request.headers.get("User-Agent"),
            details={"error": str(e)},
        )
        
        # Return error response with detailed information for troubleshooting
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User sync failed: {str(e)}",
        )
```

### Step 2: Add User Repository Debugging

**File:** `user_repository.py`
```python
def create(self, user: UserCreate) -> User:
    """Create a new user"""
    try:
        logger.info(f"Creating new user with email: {user.email}")
        
        # Create user model from schema
        db_user = User(
            email=user.email,
            display_name=user.display_name,
            identity_provider=user.identity_provider,
            identity_provider_id=user.identity_provider_id,
            status=user.status,
            user_metadata=user.user_metadata,
        )
        
        # Add to database
        self.db.add(db_user)
        
        # Try to flush to catch any constraint violations
        try:
            self.db.flush()
            logger.info(f"User flushed successfully with ID: {db_user.id}")
        except Exception as flush_error:
            logger.error(f"Error during flush: {str(flush_error)}")
            raise flush_error
            
        # Now commit
        try:
            self.db.commit()
            logger.info(f"User committed successfully with ID: {db_user.id}")
        except Exception as commit_error:
            logger.error(f"Error during commit: {str(commit_error)}")
            raise commit_error
            
        # Refresh to get generated values
        self.db.refresh(db_user)
        
        return db_user
    except Exception as e:
        self.db.rollback()
        logger.error(f"Failed to create user: {str(e)}", exc_info=True)
        raise e
```

### Step 3: Update API Configuration

**File:** `apiConfig.ts`
```typescript
/**
 * Authentication API configuration
 * Used for FastAPI user synchronization and session management
 */
export const authApiConfig = {
  // Base URL for the quodsi-fastapi service - updated with correct URL
  baseUrl: process.env.REACT_APP_QUODSI_FASTAPI_URL || 'https://quodsi-fastapi-dev.azurewebsites.net',
  
  // API endpoints for quodsi-fastapi
  endpoints: {
    // User synchronization endpoint - creates/updates users in quodsi-fastapi database
    syncUser: '/api/v1/auth/sync',
    
    // Token validation
    validateToken: '/api/v1/auth/validate',
    
    // Session management
    createSession: '/api/v1/auth/session',
    updateSession: '/api/v1/auth/session', // + /{sessionId}
    endSession: '/api/v1/auth/session',    // + /{sessionId}
    
    // User profile
    userProfile: '/api/v1/users/me'
  }
};
```

### Step 4: Implement End-to-End Testing Script

Create a new file for testing the user creation flow:

**File:** `test_user_creation.py`
```python
#!/usr/bin/env python
"""
Test script for user creation flow in Quodsi FastAPI backend.
This script simulates the token sync process to create a new user.
"""
import os
import sys
import requests
import json
import logging
from datetime import datetime, timedelta
import jwt  # pip install PyJWT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("user_creation_test")

# Configuration
API_BASE_URL = os.environ.get("QUODSI_API_URL", "http://localhost:8000")
TEST_USER_ID = f"test-user-{datetime.now().strftime('%Y%m%d%H%M%S')}"
TEST_USER_EMAIL = f"{TEST_USER_ID}@example.com"
TEST_USER_NAME = f"Test User {TEST_USER_ID}"

def create_test_token():
    """Create a test token that simulates an Entra ID token."""
    # This is a test private key - never use in production
    private_key = """
    -----BEGIN PRIVATE KEY-----
    MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZ7TJ8(...truncated...)
    -----END PRIVATE KEY-----
    """
    
    # Token payload
    now = datetime.utcnow()
    payload = {
        "iss": "https://quodsidevb2c.b2clogin.com/tenant-id/B2C_1_SignUpSignIn_EmailOnly_Dev/v2.0/",
        "sub": TEST_USER_ID,
        "aud": "71597220-4889-4c06-8c08-152dfae2082b",  # Your client ID
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "iat": int(now.timestamp()),
        "name": TEST_USER_NAME,
        "preferred_username": TEST_USER_EMAIL,
        "emails": [TEST_USER_EMAIL],
        "tid": "tenant-id",
        "oid": f"oid-{TEST_USER_ID}"
    }
    
    # Create the token
    token = jwt.encode(
        payload,
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key-id"}
    )
    
    return token

def test_user_sync():
    """Test the user synchronization endpoint."""
    token = create_test_token()
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    logger.info(f"Testing user sync for user: {TEST_USER_ID}")
    logger.info(f"API URL: {API_BASE_URL}/api/v1/auth/sync")
    
    try:
        # For testing, use the debug token endpoint first
        debug_response = requests.post(
            f"{API_BASE_URL}/api/v1/auth/debug-token",
            headers=headers,
            json={}
        )
        
        logger.info(f"Debug token response: {debug_response.status_code}")
        logger.info(json.dumps(debug_response.json(), indent=2))
        
        # Now try the actual sync
        response = requests.post(
            f"{API_BASE_URL}/api/v1/auth/sync",
            headers=headers,
            json={}
        )
        
        logger.info(f"Sync response status: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            logger.info(f"User created/synced successfully: {user_data}")
            return True
        else:
            logger.error(f"Failed to sync user. Status: {response.status_code}")
            try:
                error_data = response.json()
                logger.error(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                logger.error(f"Error content: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Exception during test: {str(e)}")
        return False

def main():
    """Main test function"""
    logger.info("Starting user creation test")
    
    result = test_user_sync()
    
    if result:
        logger.info("TEST PASSED: User creation successful")
        sys.exit(0)
    else:
        logger.error("TEST FAILED: User creation failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Verification Plan

To verify the bug is fixed, we'll implement a testing protocol:

1. **Manual Testing**:
   - Create a new user in Microsoft Entra ID
   - Sign in with the new user in the Quodsi application
   - Verify user record is created in the database
   - Check that user information matches Entra ID profile

2. **Automated Testing**:
   - Run the `test_user_creation.py` script against the development environment
   - Check database for the test user record
   - Verify all fields are correctly populated

3. **Log Analysis**:
   - Review logs during user creation process
   - Ensure no errors or warnings are present
   - Verify transaction commits successfully

## Rollout Plan

1. **Deploy to Development Environment**:
   - Deploy code changes to dev environment
   - Run automated tests
   - Perform manual verification

2. **Deploy to Staging Environment**:
   - Repeat testing in staging environment
   - Verify with real Entra ID accounts

3. **Production Deployment**:
   - Schedule deployment during low-traffic period
   - Deploy changes to production
   - Perform verification with test accounts
   - Monitor logs for any issues

## Monitoring and Maintenance

1. **Logging Monitoring**:
   - Set up alerts for user creation failures
   - Monitor authentication related logs closely for 48 hours after deployment

2. **Database Monitoring**:
   - Monitor user table for expected growth
   - Check for any orphaned records

3. **Performance Impact**:
   - Verify the additional logging doesn't impact performance
   - Consider reducing log verbosity after successful deployment

## Documentation Updates

Update documentation to include:
1. Common authentication issues and solutions
2. User creation flow diagrams
3. Authentication system architecture design
4. Troubleshooting guides for authentication errors


**File:** `user_service.py`
```python
def get_or_create_user_from_token(self, token_data: TokenPayload) -> Optional[User]:
    """Get existing user or create a new user based on token data"""
    # First, try to find user by identity provider ID
    logger.info(f"Looking for existing user with provider_id: {token_data.sub}")
    user = self.user_repo.get_by_provider_id(
        provider="entra_id", provider_id=token_data.sub
    )

    if user:
        logger.info(f"Found existing user: {user.id}")
        # Update user information if it has changed
        try:
            # This would be expanded in production to update more fields
            update_data = {
                "display_name": token_data.name
                or token_data.preferred_username
                or "Unknown",
                "last_login_at": datetime.utcnow(),
            }

            # Update user
            updated_user = self.user_repo.update(user.id, update_data)
            logger.info(f"Updated user information for user: {user.id}")

            return updated_user or user
        except Exception as e:
            logger.error(
                f"Failed to update user {user.id}: {str(e)}", exc_info=True
            )
            return user

    # Create new user since one wasn't found
    logger.info(
        f"Creating new user for token. Provider ID: {token_data.sub}. "
        f"Name: {token_data.name or token_data.preferred_username or 'Unknown'}"
    )

    # Import here to avoid circular imports
    from app.schemas.user import UserCreate

    # Try to find email in various places or generate one based on sub
    email = token_data.preferred_username
    logger.info(f"Initial email from preferred_username: {email or 'None'}")
    
    if (
        not email
        and hasattr(token_data, "emails")
        and token_data.emails
        and len(token_data.emails) > 0
    ):
        email = token_data.emails[0]
        logger.info(f"Email found in emails array: {email}")

    # For B2C tokens, we might not have an email at all
    # In this case, generate a placeholder email using the subject ID
    if not email:
        # Use the subject ID with a placeholder domain
        email = f"{token_data.sub}@placeholder.quodsi.com"
        logger.warning(f"No email found in token, using generated email: {email}")

    try:
        # Create metadata dictionary with values that exist
        metadata = {}
        if hasattr(token_data, "oid") and token_data.oid:
            metadata["oid"] = token_data.oid
        if hasattr(token_data, "tid") and token_data.tid:
            metadata["tid"] = token_data.tid
        
        logger.info(f"Creating user with email: {email}")
        logger.info(f"Display name: {token_data.name or token_data.preferred_username or 'Unknown'}")
        logger.info(f"Metadata: {metadata}")

        # Using a transaction to ensure atomicity
        new_user_data = UserCreate(
            email=email,
            display_name=token_data.name
            or token_data.preferred_username
            or "Unknown",
            identity_provider="entra_id",
            identity_provider_id=token_data.sub,
            status="active",
            user_metadata=metadata,
        )

        # Create the user within a transaction
        try:
            self.db.begin_nested()  # Create a savepoint
            new_user = self.user_repo.create(new_user_data)
            self.db.commit()  # Commit the transaction
            logger.info(f"Created new user: {new_user.id}")
            return new_user
        except Exception as inner_e:
            # Roll back to the savepoint
            self.db.rollback()
            logger.error(f"Transaction rolled back: {str(inner_e)}")
            raise inner_e
            
    except Exception as e:
        logger.error(f"Failed to create user: {str(e)}", exc_info=True)
        # Log additional details about the token payload
        logger.error(f"Token payload debug info: sub={token_data.sub}, " 
                    f"has_name={bool(token_data.name)}, "
                    f"has_preferred_username={bool(token_data.preferred_username)}, "
                    f"has_emails={hasattr(token_data, 'emails')}")
        return None