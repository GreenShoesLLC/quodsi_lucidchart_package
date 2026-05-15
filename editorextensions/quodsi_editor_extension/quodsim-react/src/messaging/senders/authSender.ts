import { useCallback, useMemo } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending auth-related messages
 */
export function useAuthSender() {
  const send = useSender();

  /**
   * Request authentication (triggers Kinde OAuth flow in extension)
   */
  const requestAuth = useCallback(() => {
    send(EnvelopeMessageType.AUTH_REQUIRED, {
      reason: 'not_authenticated',
    });
  }, [send]);

  /**
   * Request sign-out. The kinde provider's authorizationUrl in the manifest
   * includes `prompt=login`, so the next "Sign In" click will force a Kinde
   * credentials prompt regardless of any cached session cookie — letting
   * the user sign in as themselves or as a different user from a clean
   * slate. AccountStrip's handleSignOut additionally opens Kinde's `/logout`
   * URL in a new tab as defense-in-depth so the SSO session cookie is
   * killed too.
   *
   * Extension-side handler clears local state, broadcasts AUTH_STATUS(false),
   * then calls `client.revokeOAuthToken('kinde')` (added in Lucid SDK 1.1.x)
   * which revokes the token at Kinde's revoke endpoint and drops Lucid's
   * cached copy in one silent call.
   */
  const logout = useCallback(() => {
    send(EnvelopeMessageType.AUTH_LOGOUT, {});
  }, [send]);

  return useMemo(() => ({
    requestAuth,
    logout,
  }), [requestAuth, logout]);
}
