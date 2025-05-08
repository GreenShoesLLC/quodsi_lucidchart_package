/**
 * useSilentAuth.ts - Silent Authentication Hook
 * 
 * This custom React hook handles silent (background) authentication during application initialization.
 * It checks for existing authentication sessions and attempts to restore them without user interaction.
 */

import { useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMessagingDispatch, useMessaging } from '../messaging/MessageProvider';
import { debugService } from '../messaging/utils/debugService';
import { AuthStorageService } from '../services/AuthStorageService';
import { EnvelopeMessageType } from '@quodsi/shared';

// Create dedicated logger for useSilentAuth
const logger = debugService.forComponent('useSilentAuth');

/**
 * useSilentAuth Hook
 * 
 * This custom hook attempts to silently authenticate a user using Microsoft Authentication Library (MSAL).
 * If credentials exist in the MSAL cache, it will set up the authentication state without requiring user interaction.
 * As a fallback, it also checks localStorage for previously stored authentication data.
 * 
 * The hook handles these key tasks:
 * 1. Check MSAL cache for existing accounts
 * 2. If found, set the active account and update authentication state
 * 3. If not found in MSAL, check localStorage as fallback
 * 4. Update global auth state through the messaging system
 * 5. Notify the extension host about authentication status
 * 
 * @returns void - This hook does not return any values
 */
export function useSilentAuth(): void {
  // Access MSAL context data
  // - instance: The MSAL PublicClientApplication instance
  // - accounts: Array of accounts found in the MSAL cache
  // - inProgress: Status string indicating MSAL's current operation state
  const { instance, accounts, inProgress } = useMsal();

  // Access messaging system's dispatch function to update global state
  const dispatch = useMessagingDispatch();

  // Access messaging utilities and application state
  // - sendMessage: Function to send messages to the extension host
  // - app: Application state information
  // - auth: Authentication state information
  const { sendMessage, app, auth } = useMessaging();

  // The main silent authentication effect
  useEffect(() => {
    // First, mark authentication as loading to prevent premature UI updates
    logger.log('Starting silent authentication process');
    dispatch({
      type: 'AUTH_LOADING',
      silentAuthInProgress: true
    });

    // Also ensure auth state is updated at the start
    // Check localStorage immediately as a first step
    const storedAuth = AuthStorageService.loadAuthState();
    console.log('[REACT][useSilentAuth] Initial localStorage check:', {
      isAuthStateValid: AuthStorageService.isAuthStateValid(),
      hasStoredAuth: !!storedAuth,
      isAuthenticated: storedAuth?.isAuthenticated,
      hasUserInfo: !!storedAuth?.userInfo
    });

    // If we have valid auth in localStorage, use it immediately
    if (storedAuth && storedAuth.isAuthenticated && storedAuth.userInfo) {
      console.log('[REACT][useSilentAuth] IMPORTANT: Using valid auth from localStorage immediately');
      dispatch({
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated: true,
        userInfo: storedAuth.userInfo
      });
    } else {
      // Otherwise, start with not authenticated
      dispatch({
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated: false,
        userInfo: undefined
      });
    }

    // Only proceed with silent authentication when MSAL is fully initialized
    // MSAL uses 'inProgress' to indicate its current state - 'none' means it's ready
    if (inProgress === 'none') {
      // Define the silent authentication process
      const attemptSilentAuth = async () => {
        try {
          // Log the start of silent authentication process
          debugService.log('Checking for existing accounts for silent authentication');

          // Check if MSAL cache contains any accounts
          if (accounts.length > 0) {
            // If accounts exist, use the first one (most recent login)
            const account = accounts[0];

            // Log that we found an existing account
            logger.log(`Found existing account: ${account.username}, attempting silent auth`);
            logger.log(`Silent auth details: localAccountId=${account.localAccountId}, name=${account.name}`);

            // Set this account as the active account in MSAL
            // This is important for subsequent token acquisitions
            try {
              instance.setActiveAccount(account);
              logger.log('Successfully set active account for silent auth');
            } catch (e) {
              logger.error('Failed to set active account:', e);
            }

            // Create a user info object from account details
            // This will be used to update the application's auth state
            const userInfo = {
              id: account.localAccountId,
              email: account.username,
              displayName: account.name || account.username
            };

            // Update auth state in the messaging system to reflect successful authentication
            // The reducer will automatically set the lastUpdated timestamp
            logger.log(`Dispatching AUTH_STATUS_UPDATE with authenticated=true`);
            console.log(`[REACT][useSilentAuth] SUCCESS: Dispatching AUTH_STATUS_UPDATE with authenticated=true`);

            // CRITICAL: Force authState to true in local storage
            try {
              AuthStorageService.saveAuthState(true, userInfo);
              console.log(`[REACT][useSilentAuth] Saved authenticated=true to localStorage`);
            } catch (e) {
              console.error(`[REACT][useSilentAuth] Error saving to localStorage:`, e);
            }

            dispatch({
              type: 'AUTH_STATUS_UPDATE',
              isAuthenticated: true,
              userInfo
            });

            // IMPORTANT: Notify the extension host about successful authentication
            // This ensures the LucidChart extension knows about the auth state
            if (app.initialized) {
              logger.log('Notifying extension host about successful silent authentication');

              // Send AUTH_LOGIN_SUCCESS message to trigger the same flow as an explicit login
              sendMessage(EnvelopeMessageType.AUTH_LOGIN_SUCCESS, {
                idToken: 'silent-auth', // Placeholder, not a real token
                user: userInfo,
                newUser: false
              });

              // Also send REQUEST_AUTH_STATUS as a backup mechanism
              // This helps synchronize auth state between React app and extension
              setTimeout(() => {
                logger.log('Sending REQUEST_AUTH_STATUS as backup');
                sendMessage(EnvelopeMessageType.REQUEST_AUTH_STATUS, {});
              }, 500);
            }

            logger.log('Silent authentication successful');
          } else {
            // No MSAL accounts found, try localStorage as fallback
            // This handles cases where the user authenticated in a different panel
            const storedAuth = AuthStorageService.loadAuthState();

            if (storedAuth && storedAuth.isAuthenticated && storedAuth.userInfo) {
              // Found valid auth state in localStorage, restore it
              logger.log('Restoring auth state from localStorage');

              // Update auth state in the messaging system
              // The reducer will automatically set the lastUpdated timestamp
              logger.log(`Dispatching AUTH_STATUS_UPDATE from localStorage with authenticated=true`);
              console.log(`[REACT][useSilentAuth] SUCCESS: Dispatching AUTH_STATUS_UPDATE with authenticated=true from localStorage`);

              // CRITICAL: Re-save the auth state to localStorage to ensure it's fresh
              try {
                AuthStorageService.saveAuthState(true, storedAuth.userInfo);
                console.log(`[REACT][useSilentAuth] Re-saved authenticated=true to localStorage`);
              } catch (e) {
                console.error(`[REACT][useSilentAuth] Error re-saving to localStorage:`, e);
              }

              dispatch({
                type: 'AUTH_STATUS_UPDATE',
                isAuthenticated: true,
                userInfo: storedAuth.userInfo || undefined
              });

              // Notify the extension host about restored authentication
              if (app.initialized && storedAuth.userInfo) {
                logger.log('Notifying extension host about restored authentication from localStorage');

                // Use AUTH_LOGIN_SUCCESS to trigger the same login flow
                sendMessage(EnvelopeMessageType.AUTH_LOGIN_SUCCESS, {
                  idToken: 'localStorage-auth', // Placeholder
                  user: storedAuth.userInfo,
                  newUser: false
                });

                // Also send REQUEST_AUTH_STATUS as a backup
                setTimeout(() => {
                  logger.log('Sending REQUEST_AUTH_STATUS as backup');
                  sendMessage(EnvelopeMessageType.REQUEST_AUTH_STATUS, {});
                }, 500);
              }

              logger.log('Auth state restored from localStorage');
            } else {
              // No valid authentication found anywhere
              logger.log('No existing authentication found');

              // Explicitly set not authenticated to ensure auth state is initialized
              // This is important to complete the initialization flow
              // The reducer will automatically set the lastUpdated timestamp
              logger.log(`Dispatching AUTH_STATUS_UPDATE with not authenticated`);

              dispatch({
                type: 'AUTH_STATUS_UPDATE',
                isAuthenticated: false,
                userInfo: undefined
              });
            }
          }
        } catch (error) {
          // Handle any errors during the authentication process
          logger.error('Silent authentication failed:', error);

          // Even on error, ensure auth state is initialized to prevent UI hanging
          // The reducer will automatically set the lastUpdated timestamp
          logger.log(`Dispatching AUTH_STATUS_UPDATE after error with authenticated=false`);

          dispatch({
            type: 'AUTH_STATUS_UPDATE',
            isAuthenticated: false,
            userInfo: undefined
          });
        } finally {
          // Regardless of success or failure, mark authentication as no longer loading
          // This signals that the authentication process has completed
          logger.log('Marking auth loading as complete');

          // CRITICAL: Ensure we're authenticated if we found an account
          const finalAuthState = auth.isAuthenticated || accounts.length > 0 || AuthStorageService.isAuthStateValid();
          if (finalAuthState) {
            console.log('[REACT][useSilentAuth] IMPORTANT: Setting final auth state to authenticated=true');
          }

          dispatch({
            type: 'AUTH_LOADING',
            silentAuthInProgress: false
          });

          // Also ensure an AUTH_STATUS_UPDATE is dispatched to set lastUpdated timestamp
          // This helps MessageProvider know a complete auth cycle has finished
          // by checking for both silentAuthInProgress=false and a defined lastUpdated value
          logger.log(`Final AUTH_STATUS_UPDATE to ensure lastUpdated is set`);

          dispatch({
            type: 'AUTH_STATUS_UPDATE',
            isAuthenticated: finalAuthState,
            userInfo: auth.userInfo
          });

          // Double check localStorage state
          const finalStoredAuth = AuthStorageService.loadAuthState();
          console.log('[REACT][useSilentAuth] Final localStorage state:', {
            isAuthStateValid: AuthStorageService.isAuthStateValid(),
            hasStoredAuth: !!finalStoredAuth,
            isAuthenticated: finalStoredAuth?.isAuthenticated,
            hasUserInfo: !!finalStoredAuth?.userInfo
          });
        }
      };

      // Execute the silent authentication process
      attemptSilentAuth();
    }
    // Dependencies ensure this effect runs when MSAL state changes or app is initialized
  }, [inProgress, accounts, dispatch, instance, sendMessage, app.initialized]);
}