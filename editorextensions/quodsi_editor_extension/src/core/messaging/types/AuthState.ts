import { QuodsiUserInfo } from '@quodsi/shared';

/**
 * Authentication state structure
 * Represents the current authentication state of the application
 */
export interface AuthState {
  isAuthenticated: boolean;  // Whether the user is authenticated
  user?: QuodsiUserInfo;     // User information if authenticated
}
