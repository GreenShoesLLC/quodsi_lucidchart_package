import { EnvelopeBase, EnvelopeMessageType, ExtensionConfig, QuodsiUserInfo } from '@quodsi/shared';
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Map from Lucid package ID (from `lucid.getPackageId()`) to the Studio web
 * app's origin for that environment. Used to populate ExtensionConfig in
 * AUTH_STATUS broadcasts so the React panel can open Studio's /welcome page
 * for the "Create New User" flow without hardcoding URLs in React.
 *
 * Lucid package IDs come from the `id` field of each manifest_*.json:
 *   - 29e0d321-… = QuodsiDev (manifest.json default + manifest_dev.json + manifest_local.json)
 *   - dcde0747-… = QuodsiTest (manifest_test.json)
 *   - d38c7ced-… = Quodsi prod (manifest_prod.json)
 */
const STUDIO_URL_BY_PACKAGE_ID: Record<string, string> = {
  '29e0d321-5cb2-4ae0-a1b6-dabd512c098c': 'https://dev-studio.quodsi.com',
  'dcde0747-95a4-4bf8-9e17-b4cf41afa1c7': 'https://test-studio.quodsi.com',
  'd38c7ced-35e8-4962-a622-1d3fa480ab58': 'https://studio.quodsi.com',
};

/**
 * Build-time local-dev override for the Studio URL. Injected by webpack's
 * DefinePlugin from `local-studio-url.txt` (gitignored). The developer
 * creates that file once with a single line like `https://localhost:3030`
 * and the override is baked into every local build automatically.
 *
 * In CI / cloud bundles the file doesn't exist → __LOCAL_STUDIO_OVERRIDE__
 * is the empty string → no override → falls back to per-package-ID lookup
 * (production behavior).
 *
 * No source-code editing per build, no remembering to revert. See
 * webpack.config.js `readLocalStudioOverride()` for the inject logic.
 */
function getExtensionConfig(): ExtensionConfig {
  if (__LOCAL_STUDIO_OVERRIDE__) {
    return { studioBaseUrl: __LOCAL_STUDIO_OVERRIDE__ };
  }
  let studioBaseUrl: string | undefined;
  try {
    const packageId = lucid.getPackageId();
    studioBaseUrl = STUDIO_URL_BY_PACKAGE_ID[packageId];
  } catch {
    // lucid global isn't available in some test contexts; leave undefined.
  }
  return { studioBaseUrl };
}

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
   * Handle AUTH_LOGOUT: full sign-out flow.
   *
   * The plain "clear local state and broadcast" version is functionally
   * useless because Lucid platform-side caches the OAuth token; clicking
   * "Sign In" right after a logout would just return the cached token and
   * sign the user back in as themselves. Real sign-out requires forcing
   * Lucid to drop its cache, which is what `triggerAuthFlow('kinde')`
   * does (it's the SDK's documented re-auth entry point).
   *
   * Caller (React panel) is expected to have already opened Kinde's
   * `/logout` URL in a new tab to clear Kinde's session cookie BEFORE
   * sending this message. Without that, Kinde silently re-auths the
   * same user via session cookie and triggerAuthFlow returns the same
   * identity — net result for the user is no apparent sign-out.
   *
   * After this runs the user is either:
   *   - Signed out (Lucid OAuth popup was closed by user) — common case
   *   - Signed in as a different user (used the Kinde signup/login screen)
   *   - Signed back in as the same user (if Kinde session somehow survived
   *     the /logout step or the OAuth popup auto-completed)
   */
  private static async handleLogout(msg: EnvelopeBase): Promise<void> {
    try {
      AuthHandler.logger.log('Sign-out requested; clearing local state');
      AuthHandler.isAuthenticated = false;
      AuthHandler.currentUser = undefined;
      AuthHandler.currentToken = undefined;
      AuthHandler.broadcastAuthStatus(false);

      const client = ModelManager.getClient();
      AuthHandler.logger.log('Calling client.triggerAuthFlow(kinde) to invalidate Lucid cache...');
      const result = await client.triggerAuthFlow('kinde');
      AuthHandler.logger.log('triggerAuthFlow result:', result);

      const token = await client.getOAuthToken('kinde');
      if (token) {
        // Lucid returned a token after the re-auth — process it (user
        // either silently re-auth'd as themselves, signed in as someone
        // else, or signed up fresh).
        await AuthHandler.processToken(token);
      } else {
        // No token returned — user dismissed the OAuth popup. They're
        // genuinely signed out now.
        AuthHandler.logger.log('No token after triggerAuthFlow; user is signed out');
        AuthHandler.broadcastAuthStatus(false);
      }
    } catch (error) {
      AuthHandler.logger.error('Sign-out error:', error);
      AuthHandler.broadcastAuthError(
        'AUTH_FAILED',
        error instanceof Error ? error.message : String(error)
      );
    }
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
      // iss is the Kinde tenant URL (e.g., https://quodsim-dev.us.kinde.com).
      // Forwarded to the React panel so the "Sign in as different user"
      // dev-tooling button can construct the Kinde logout URL.
      kindeIssuer: typeof claims.iss === 'string' ? claims.iss : undefined,
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
      }) as { status?: number; json?: any };

      AuthHandler.logger.log('User synced to quodsi_api:', result);

      // Path A — backend may have moved this user out of the shared default
      // org and into a personal org. The current JWT still references the
      // old org_code; subsequent backend calls use `user.kinde_org_code`
      // from the DB (correct value) so most things still work. The orgCode
      // we broadcast to the React panel is stale until next token refresh,
      // which we let happen naturally on Kinde token expiry rather than
      // forcing a re-auth that would interrupt the just-completed sign-in.
      if (result?.json?.tokenRefreshRequired) {
        const newOrgCode = result.json?.user?.org_code;
        AuthHandler.logger.log(
          'Path A: backend personalized this user. Token refresh required.',
          { newOrgCode }
        );
        // Update local state so the React panel sees the new org_code
        // immediately without waiting for token refresh.
        if (newOrgCode && AuthHandler.currentUser) {
          AuthHandler.currentUser = {
            ...AuthHandler.currentUser,
            orgCode: newOrgCode,
          };
          AuthHandler.broadcastAuthStatus(true, AuthHandler.currentUser);
        }
      }
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
      // ExtensionConfig piggybacks on every AUTH_STATUS so the React panel
      // gets it without a separate message type. Same value each time;
      // React-side cache is fine.
      data: { isAuthenticated, user, config: getExtensionConfig() },
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
