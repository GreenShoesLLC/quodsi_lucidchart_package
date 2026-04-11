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
   * Request logout (clears auth state in extension)
   */
  const logout = useCallback(() => {
    send(EnvelopeMessageType.AUTH_LOGOUT, {});
  }, [send]);

  return useMemo(() => ({
    requestAuth,
    logout,
  }), [requestAuth, logout]);
}
