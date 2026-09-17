/**
 * User information structure shared across auth messages
 */
export interface QuodsiUserInfo {
  /** Kinde user ID (sub claim) */
  id: string;

  /** User email address (from user_profile endpoint) */
  email: string;

  /** Friendly display name (from user_profile endpoint) */
  displayName?: string;

  /** Kinde organization code (from access token org_code claim) */
  orgCode?: string;

  /** Kinde tenant issuer URL (from access token iss claim). Used by the
   *  React panel to construct the Kinde logout URL for the dev-tooling
   *  "Sign in as different user" flow. */
  kindeIssuer?: string;
}

/**
 * Environment-level config broadcast to the React panel once at startup
 * (or whenever it might change — it doesn't in practice). Keeps configurable
 * URLs out of the React bundle so the same React build can run against any
 * Lucid app (QuodsiDev / QuodsiTest / Quodsi prod) — the extension's
 * authHandler looks them up at runtime from `lucid.getPackageId()`.
 */
export interface ExtensionConfig {
  /** Origin of the Studio web app for this Lucid package (e.g.,
   *  `https://dev-studio.quodsi.com`). Used by the AccountStrip's
   *  "Create New User" menu item to open Studio's /welcome page in a new
   *  tab for new-user signup (Studio handles the Kinde signup with
   *  isCreateOrg + planInterest atomically, which the Lucid extension's
   *  platform-mediated OAuth flow can't). No trailing slash. */
  studioBaseUrl?: string;

  /** Sales contact address for PlanDetails's "Contact us" block (behind
   *  AuthStatusIndicator's "Plan details" disclosure; mailto link + visible
   *  copy-to-clipboard address). Optional and
   *  environment-overridable for the same reason as `studioBaseUrl` — kept
   *  out of the React bundle so one build can run against any Lucid app.
   *  Absent on older hosts (or if the host never chooses to set it); the
   *  panel falls back to a hardcoded `sales@quodsi.com` default in that
   *  case. Deliberately NOT a CRA build var (`REACT_APP_*`), which would
   *  bake a single hardcoded value into the compiled bundle. */
  salesEmail?: string;
}
