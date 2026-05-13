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
   * Request sign-out. Caller should open Kinde's `/logout` URL in a new tab
   * BEFORE invoking this so Kinde's session cookie is cleared too; otherwise
   * the post-logout triggerAuthFlow silently re-auths the same user via
   * session cookie. See AccountStrip's handleSignOut for the canonical
   * caller pattern.
   *
   * Extension-side handler clears local state, calls
   * `client.triggerAuthFlow('kinde')` to invalidate Lucid's cached OAuth
   * token, then handles whatever the OAuth flow returns (a fresh token if
   * user re-auth'd, nothing if they dismissed the popup → genuinely
   * signed out).
   */
  const logout = useCallback(() => {
    send(EnvelopeMessageType.AUTH_LOGOUT, {});
  }, [send]);

  return useMemo(() => ({
    requestAuth,
    logout,
  }), [requestAuth, logout]);
}
