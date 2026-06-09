import { EnvelopeBase, EnvelopeMessageType, ExtensionConfig, QuodsiUserInfo } from '@quodsi/lucid-shared';
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

/**
 * Resolve the Studio web app's base URL for the current environment.
 *
 * Resolution order:
 *   1. `__LOCAL_STUDIO_OVERRIDE__` — build-time inject from `local-studio-url.txt`
 *      (e.g. `https://localhost:3030`). Non-empty only in local dev builds.
 *   2. `STUDIO_URL_BY_PACKAGE_ID[lucid.getPackageId()]` — package-ID lookup for
 *      dev / test / prod deployments.
 *   3. `undefined` — if the packageId is unknown or the Lucid global is not
 *      available (e.g. unit-test context).
 *
 * Exported so other extension modules (e.g. modals that embed Studio iframes)
 * can resolve the correct origin without duplicating this logic.
 */
export function getStudioBaseUrl(): string | undefined {
  if (__LOCAL_STUDIO_OVERRIDE__) {
    return __LOCAL_STUDIO_OVERRIDE__;
  }
  try {
    const packageId = lucid.getPackageId();
    return STUDIO_URL_BY_PACKAGE_ID[packageId];
  } catch {
    // lucid global isn't available in some test contexts; leave undefined.
    return undefined;
  }
}

function getExtensionConfig(): ExtensionConfig {
  return { studioBaseUrl: getStudioBaseUrl() };
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
  private static authReadyListeners: Array<() => void> = [];

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
   * Register a callback to run once Kinde auth is established (token available,
   * user identified). Host components whose data-connector calls need an
   * authenticated Kinde token register here — notably the panel-init model
   * upsert, which can fire before auth completes on a cold load and otherwise
   * fails with a 404 on the kinde OAuth token. Listeners must guard their own
   * re-entry (this may fire more than once across a session, e.g. token refresh).
   * If auth is already established when registering, the callback fires
   * immediately so late registrants don't miss the event.
   */
  public static registerAuthReadyListener(cb: () => void): void {
    AuthHandler.authReadyListeners.push(cb);
    if (AuthHandler.isAuthenticated) {
      AuthHandler.runAuthReadyListener(cb);
    }
  }

  private static runAuthReadyListener(cb: () => void): void {
    try {
      cb();
    } catch (error) {
      AuthHandler.logger.error('authReady listener threw:', error);
    }
  }

  private static notifyAuthReady(): void {
    for (const cb of AuthHandler.authReadyListeners) {
      AuthHandler.runAuthReadyListener(cb);
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
   * Uses Lucid SDK's `revokeOAuthToken('kinde')` to revoke the access token
   * at Kinde's revocation endpoint and drop it from Lucid's cache in one
   * silent call. The endpoint URL comes from the manifest's
   * `oauthProviders.kinde.revokeTokenUrl` field.
   *
   * Caller (React panel) is expected to have already opened Kinde's
   * `/logout` URL in a new tab to kill Kinde's SSO session cookie BEFORE
   * sending this message. Token revocation alone does NOT end the user's
   * authenticated session at Kinde — without the cookie kill, clicking
   * "Sign In" right after Sign Out would silently issue a fresh token to
   * the same user and the sign-out would appear to have no effect.
   *
   * If revoke returns false (Kinde's revoke endpoint failed), we still
   * proceed with local state clearing — the user's intent was Sign Out,
   * and a stale token Lucid has forgotten about is the lesser evil
   * compared to leaving the user apparently signed in.
   */
  private static async handleLogout(msg: EnvelopeBase): Promise<void> {
    try {
      AuthHandler.logger.log('Sign-out requested; clearing local state');
      AuthHandler.isAuthenticated = false;
      AuthHandler.currentUser = undefined;
      AuthHandler.currentToken = undefined;
      AuthHandler.broadcastAuthStatus(false);

      const client = ModelManager.getClient();
      AuthHandler.logger.log('Calling client.revokeOAuthToken(kinde)...');
      const revoked = await client.revokeOAuthToken('kinde');
      AuthHandler.logger.log('revokeOAuthToken result:', { revoked });

      if (!revoked) {
        // Kinde's revoke endpoint rejected the call. Local state is
        // already cleared above; log and move on rather than leaving
        // the user apparently signed in.
        AuthHandler.logger.log(
          'revokeOAuthToken returned false; local sign-out completed regardless'
        );
      }

      // Belt-and-suspenders: also call clearOAuthToken in case Lucid keeps
      // any residual cache layer (e.g., refresh token, identity link) that
      // revokeOAuthToken doesn't fully drop. Observed during smoke testing:
      // with prompt=login in the manifest, the next Sign In still silently
      // re-issued for the same user — suggesting some Lucid-side state
      // survives revoke. Calling clear here forces a clean slate.
      AuthHandler.logger.log('Calling client.clearOAuthToken(kinde)...');
      const cleared = await client.clearOAuthToken('kinde');
      AuthHandler.logger.log('clearOAuthToken result:', { cleared });
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

    // Kinde token is now available, so any data-connector call that raced
    // ahead of auth on panel init (e.g. the model upsert) can now succeed.
    // Notify listeners so they can retry. Listeners self-guard re-entry.
    AuthHandler.notifyAuthReady();
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
    upgradeAvailable?: boolean;
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

      // Backfill email/displayName from the backend's SyncUser response.
      // Kinde's /oauth2/v2/user_profile endpoint returns 400 in some
      // token-audience combinations (observed after the lucid-extension-sdk
      // 1.1.x bump), leaving the JWT-derived currentUser with empty email
      // and displayName. The backend is the authoritative source for these
      // fields — use its response whenever the local copy is missing.
      const backendUser = result?.json?.user;
      if (backendUser && AuthHandler.currentUser) {
        const patch: Partial<QuodsiUserInfo> = {};
        if (!AuthHandler.currentUser.email && backendUser.email) {
          patch.email = backendUser.email;
        }
        if (!AuthHandler.currentUser.displayName && backendUser.display_name) {
          patch.displayName = backendUser.display_name;
        }
        if (Object.keys(patch).length > 0) {
          AuthHandler.logger.log('Backfilling currentUser from backend:', patch);
          AuthHandler.currentUser = { ...AuthHandler.currentUser, ...patch };
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

  /**
   * True if the token is missing an `exp`, or expires within `bufferSec`.
   * Unknown expiry is treated as expiring so we re-fetch a known-good token.
   */
  private static isTokenExpiring(token: string, bufferSec = 120): boolean {
    const claims = AuthHandler.decodeTokenClaims(token);
    const exp = claims && typeof claims.exp === 'number' ? claims.exp : null;
    if (exp === null) return true;
    return Math.floor(Date.now() / 1000) >= exp - bufferSec;
  }

  /**
   * Get a fresh token to relay into the embedded Studio iframe.
   *
   * The cached `currentToken` is set once at sign-in and never re-fetched, so
   * after its ~1h TTL the embed would receive an expired token (sync 401s,
   * scenario create silently fails). Lucid's `getOAuthToken` refreshes the
   * access token server-side from its stored refresh token (prompting only if
   * the grant is truly dead), so re-calling it yields a fresh token. We only
   * pay that round-trip when the cached token is actually expiring.
   */
  public static async getTokenForRelay(): Promise<string | undefined> {
    if (AuthHandler.currentToken && !AuthHandler.isTokenExpiring(AuthHandler.currentToken)) {
      return AuthHandler.currentToken;
    }
    try {
      const client = ModelManager.getClient();
      const token = await client.getOAuthToken('kinde');
      if (token) {
        AuthHandler.currentToken = token;
        AuthHandler.logger.log('Relayed a refreshed Kinde token to the embed');
        return token;
      }
    } catch (error) {
      AuthHandler.logger.error('getTokenForRelay: refresh failed, relaying cached token', error);
    }
    return AuthHandler.currentToken;
  }

  /** Check if user is currently authenticated */
  public static getIsAuthenticated(): boolean {
    return AuthHandler.isAuthenticated;
  }
}
