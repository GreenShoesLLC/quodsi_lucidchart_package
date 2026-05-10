import { EnvelopeBase, EnvelopeMessageType, QuodsiUserInfo } from '@quodsi/shared';
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Handler for Kinde authentication operations.
 * Manages getOAuthToken('kinde') calls and broadcasts AUTH_STATUS to React.
 */
export class AuthHandler {
  private static logger = ExtensionDebugService.forComponent('AuthHandler');
  private static isAuthenticated = false;
  private static currentUser: QuodsiUserInfo | undefined;
  private static currentToken: string | undefined;

  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.AUTH_REQUIRED:
        AuthHandler.handleAuthRequired(msg);
        return true;
      case EnvelopeMessageType.AUTH_LOGOUT:
        AuthHandler.handleLogout(msg);
        return true;
      default:
        return false;
    }
  }

  /**
   * Non-blocking check for cached Kinde token.
   * Called after REACT_APP_READY to set initial auth state.
   */
  public static async checkCachedAuth(): Promise<void> {
    try {
      const client = ModelManager.getClient();
      AuthHandler.logger.log('Checking for cached Kinde token...');

      const token = await client.getOAuthToken('kinde');

      if (token) {
        AuthHandler.logger.log('Cached Kinde token found, fetching user profile...');
        await AuthHandler.processToken(token);
      } else {
        AuthHandler.logger.log('No cached Kinde token');
        AuthHandler.broadcastAuthStatus(false);
      }
    } catch (error) {
      AuthHandler.logger.error('Error checking cached auth:', error);
      AuthHandler.broadcastAuthStatus(false);
    }
  }

  /**
   * Handle AUTH_REQUIRED: user clicked Sign In or a gated action.
   * Initiates the Kinde OAuth flow via LucidChart's native popup.
   */
  private static async handleAuthRequired(msg: EnvelopeBase): Promise<void> {
    try {
      const client = ModelManager.getClient();
      AuthHandler.logger.log('Auth required, initiating Kinde OAuth flow...');

      const token = await client.getOAuthToken('kinde');

      if (token) {
        await AuthHandler.processToken(token);
      } else {
        AuthHandler.logger.log('No token returned (user may have cancelled)');
        AuthHandler.broadcastAuthStatus(false);
      }
    } catch (error) {
      AuthHandler.logger.error('Error during Kinde auth:', error);
      AuthHandler.broadcastAuthError(
        'AUTH_FAILED',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Handle AUTH_LOGOUT: clear local auth state.
   */
  private static handleLogout(msg: EnvelopeBase): void {
    AuthHandler.logger.log('Logging out, clearing auth state');
    AuthHandler.isAuthenticated = false;
    AuthHandler.currentUser = undefined;
    AuthHandler.currentToken = undefined;
    AuthHandler.broadcastAuthStatus(false);
  }

  /**
   * Process a valid token: decode claims, fetch user profile, broadcast status.
   */
  private static async processToken(token: string): Promise<void> {
    // Decode access token for sub and org_code
    const claims = AuthHandler.decodeTokenClaims(token);
    if (!claims || !claims.sub) {
      AuthHandler.logger.error('Token missing sub claim');
      AuthHandler.broadcastAuthStatus(false);
      return;
    }

    // Fetch user profile for email and display name. Derive the URL from the
    // token's `iss` claim so the same build works against any Kinde tenant
    // (prd, dev, future tenants). The manifest's `domainWhitelist` on the
    // `kinde` OAuth provider gates the call at the Lucid SDK layer, so a
    // spoofed `iss` is blocked there too.
    let email = '';
    let displayName: string | undefined;
    try {
      const issuer = typeof claims.iss === 'string' ? claims.iss : null;
      if (!issuer) {
        AuthHandler.logger.log('Token missing iss claim; skipping user profile fetch');
      } else {
        const client = ModelManager.getClient();
        const profileResponse = await client.oauthXhr('kinde', {
          url: `${issuer.replace(/\/$/, '')}/oauth2/v2/user_profile`,
          method: 'GET',
          responseFormat: 'utf8',
        });

        if (profileResponse) {
          const profile = JSON.parse(profileResponse.responseText);
          email = profile.email || '';
          displayName = profile.name || profile.given_name || undefined;
          AuthHandler.logger.log('User profile:', { email, displayName });
        }
      }
    } catch (error) {
      AuthHandler.logger.log('Could not fetch user profile, continuing with token claims only:', error);
    }

    const user: QuodsiUserInfo = {
      id: claims.sub,
      email,
      displayName,
      orgCode: claims.org_code || undefined,
    };

    AuthHandler.isAuthenticated = true;
    AuthHandler.currentUser = user;
    AuthHandler.currentToken = token;

    AuthHandler.logger.log('Auth successful:', { id: user.id, email: user.email, orgCode: user.orgCode });
    AuthHandler.broadcastAuthStatus(true, user);

    // Sync user to quodsi_api database via the Lucid data connector.
    // Non-blocking: a sync failure does not block the sign-in flow.
    AuthHandler.syncUserToDatabase(user).catch((error) => {
      AuthHandler.logger.error('Failed to sync user to quodsi_api:', error);
    });

    // Fetch entitlements and broadcast to the React panel. Non-blocking; the UI
    // falls back to "free plan" defaults if this request fails or is slow.
    AuthHandler.fetchAndBroadcastEntitlements().catch((error) => {
      AuthHandler.logger.error('Failed to fetch entitlements:', error);
    });
  }

  /**
   * Fetch /me/entitlements from quodsi_api via the data connector and broadcast
   * an ENTITLEMENTS_STATUS message so the React panel can gate paid features.
   */
  private static async fetchAndBroadcastEntitlements(): Promise<void> {
    try {
      const client = ModelManager.getClient();
      // performDataAction returns { status, json } where `json` is the actual
      // response body. We care about the body.
      const result = await client.performDataAction({
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'GetMyEntitlements',
        actionData: {},
        asynchronous: false,
      }) as { status?: number; json?: any };

      AuthHandler.logger.log('Entitlements fetched:', result);

      if (!result?.json) {
        AuthHandler.logger.log(
          'Entitlements fetch returned no body; UI stays on free defaults. Status:',
          result?.status
        );
        return;
      }

      AuthHandler.broadcastEntitlements(result.json);
    } catch (error) {
      AuthHandler.logger.log(
        'Entitlements fetch failed (UI stays on free defaults):',
        error
      );
    }
  }

  private static broadcastEntitlements(data: {
    subjectType: string;
    planKey: string;
    planStatus: string;
    trialExpiresAt?: string;
    features: Record<string, unknown>;
  }): void {
    router.send('broadcast', {
      id: generateId(),
      type: EnvelopeMessageType.ENTITLEMENTS_STATUS,
      source: 'host',
      target: 'broadcast',
      version: '1.0',
      data,
    });
  }

  /**
   * Sync the authenticated user to quodsi_api database via the Lucid data connector.
   * Registered in the manifest as "quodsi_api_data_connector" with the "kinde"
   * OAuth provider, so Lucid attaches the Kinde token automatically.
   */
  private static async syncUserToDatabase(user: QuodsiUserInfo): Promise<void> {
    try {
      const client = ModelManager.getClient();
      AuthHandler.logger.log('Syncing user to quodsi_api database...');

      const result = await client.performDataAction({
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'SyncUser',
        actionData: {
          email: user.email,
          displayName: user.displayName,
        },
        asynchronous: false,
      });

      AuthHandler.logger.log('User synced to quodsi_api:', result);
    } catch (error) {
      AuthHandler.logger.error('syncUserToDatabase error:', error);
      throw error;
    }
  }

  /**
   * Decode JWT payload without verification.
   * Uses manual base64 decode safe for the extension sandbox (no atob/Buffer).
   */
  private static decodeTokenClaims(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let output = '';
      let buffer = 0;
      let bits = 0;
      for (let i = 0; i < base64.length; i++) {
        const idx = chars.indexOf(base64[i]);
        if (idx === -1) continue;
        buffer = (buffer << 6) | idx;
        bits += 6;
        if (bits >= 8) {
          bits -= 8;
          output += String.fromCharCode((buffer >> bits) & 0xff);
        }
      }

      return JSON.parse(output);
    } catch (error) {
      AuthHandler.logger.error('Failed to decode token:', error);
      return null;
    }
  }

  private static broadcastAuthStatus(isAuthenticated: boolean, user?: QuodsiUserInfo): void {
    router.send('broadcast', {
      id: generateId(),
      type: EnvelopeMessageType.AUTH_STATUS,
      source: 'host',
      target: 'broadcast',
      version: '1.0',
      data: { isAuthenticated, user },
    });
  }

  private static broadcastAuthError(code: string, message: string): void {
    router.send('broadcast', {
      id: generateId(),
      type: EnvelopeMessageType.AUTH_ERROR,
      source: 'host',
      target: 'broadcast',
      version: '1.0',
      data: { code, message },
    });
  }

  /** Get the current token for use by other handlers (e.g., SimulationHandler) */
  public static getToken(): string | undefined {
    return AuthHandler.currentToken;
  }

  /** Check if user is currently authenticated */
  public static getIsAuthenticated(): boolean {
    return AuthHandler.isAuthenticated;
  }
}
