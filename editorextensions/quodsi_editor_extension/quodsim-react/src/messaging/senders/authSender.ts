import { EnvelopeMessageType, QuodsiUserInfo } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending auth-related messages
 * 
 * @returns Object containing auth message sender functions
 */
export function useAuthSender() {
  const send = useSender();
  
  /**
   * Send an AUTH_LOGIN_SUCCESS message
   * 
   * @param idToken JWT token from authentication
   * @param user User information
   * @param newUser Flag indicating if this is a new user
   */
  const sendLoginSuccess = (
    idToken: string,
    user: QuodsiUserInfo,
    newUser: boolean
  ) => {
    send(EnvelopeMessageType.AUTH_LOGIN_SUCCESS, {
      idToken,
      user,
      newUser
    });
  };
  
  /**
   * Send an AUTH_LOGOUT message
   */
  const sendLogout = () => {
    send(EnvelopeMessageType.AUTH_LOGOUT, {});
  };
  
  /**
   * Send an AUTH_PASSWORD_RESET message
   * 
   * @param email Email address associated with the reset password
   */
  const sendPasswordReset = (email: string) => {
    send(EnvelopeMessageType.AUTH_PASSWORD_RESET, {
      email
    });
  };
  
  /**
   * Request current authentication status
   */
  const requestAuthStatus = () => {
    // This isn't a standard protocol message, but if needed
    // for request-response patterns in the future
  };
  
  return {
    sendLoginSuccess,
    sendLogout,
    sendPasswordReset,
    requestAuthStatus
  };
}
