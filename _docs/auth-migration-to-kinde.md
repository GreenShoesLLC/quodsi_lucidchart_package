# Authentication: Adding Kinde to Censio

**Status**: Planning
**Date**: 2025-03-24
**Goal**: Implement user authentication using Kinde across all Censio surfaces

---

## Multi-Surface Architecture

Censio will be available through multiple surfaces, each with its own auth integration strategy but sharing a **single Kinde tenant** so users have one identity everywhere.

```
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│  Standalone Website     │ │  LucidChart Extension   │ │  Miro Extension         │
│                         │ │                         │ │  (planned)              │
│  Kinde React SDK        │ │  Lucid OAuth Provider   │ │  Miro OAuth Provider    │
│  (@kinde-oss/           │ │  (manifest              │ │  (platform-native       │
│   kinde-auth-react)     │ │   oauthProviders)       │ │   auth, TBD)            │
│                         │ │                         │ │                         │
│  Standard SPA auth:     │ │  Extension-managed:     │ │  Extension-managed:     │
│  KindeProvider, hooks,  │ │  getOAuthToken('kinde') │ │  approach TBD based on  │
│  full login/logout UX   │ │  → decode JWT           │ │  Miro's extension SDK   │
│                         │ │  → broadcast to React   │ │                         │
│  Kinde client type:     │ │  Kinde client type:     │ │  Kinde client type:     │
│  SPA (PKCE)             │ │  Regular Web App        │ │  TBD                    │
└────────────┬────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
             │                           │                           │
             │      Same Kinde tenant    │    Same user accounts     │
             └───────────┬───────────────┴───────────┬───────────────┘
                         │                           │
                         ▼                           ▼
              ┌─────────────────────┐     ┌────────────────────┐
              │  Azure Functions    │     │  Simulation Engine  │
              │  Data Connector     │     │  (Python/SimPy)     │
              │                     │     │                     │
              │  Kinde TypeScript   │     │  No user auth       │
              │  SDK (JWT verify)   │     │  (service-level)    │
              └─────────────────────┘     └────────────────────┘
```

### Kinde Clients Per Surface

| Surface | Kinde Client Type | Kinde SDK | Auth Approach |
|---------|------------------|-----------|---------------|
| **Standalone website** | SPA (authorization code + PKCE) | `@kinde-oss/kinde-auth-react` | Standard React SDK integration — `KindeProvider`, hooks, full UX |
| **LucidChart extension** | Regular Web Application | None (Lucid handles token exchange) | Register Kinde as Lucid `oauthProvider`; extension calls `getOAuthToken('kinde')` |
| **Miro extension** (planned) | TBD | TBD | Will depend on Miro's extension SDK auth capabilities — likely similar platform-native OAuth pattern |
| **Data connector** (backend) | N/A (validates tokens from any surface) | `@kinde-oss/kinde-typescript-sdk` | JWT verification via Kinde's JWKS endpoint |

All clients share the same Kinde tenant. A user who signs up via the standalone website can use the same identity in LucidChart and Miro.

### Surface Responsibilities

Not all surfaces are equal. The standalone website is the **primary account management surface** while extensions are focused on the simulation workflow.

| Capability | Extension (300px side panel) | Standalone Website |
|-----------|----------------------------|-------------------|
| Sign in / basic sign up | Yes (via Kinde hosted page in platform popup) | Yes |
| Plan comparison / pricing page | No | Yes |
| Payment / billing (Stripe, etc.) | No | Yes |
| Account settings / profile edit | Minimal (display name, email) | Full |
| Org / team management | No | Yes |
| Subscription upgrade / downgrade | No | Yes |
| Invoices / billing history | No | Yes |
| Usage dashboard | No | Yes |
| Simulation modeling | Yes (core workflow) | TBD |
| Results viewing | Yes (core workflow) | TBD |

### Registration & Upgrade Flow

Basic account creation works from any surface — Kinde's hosted auth page includes both sign-in and sign-up. But payment, plan management, and full account settings live on the standalone website.

**Typical user journey:**

```
1. User discovers Quodsi in LucidChart marketplace
2. Installs extension, clicks panel → sees "Sign In / Sign Up"
3. Creates free account via Kinde popup (basic registration)
4. Uses free-tier simulation features in LucidChart
5. Hits a limit → extension shows "Upgrade your plan" with link
6. Link opens standalone website → pricing page → payment flow
7. Returns to extension → token already reflects new plan/role
```

```
┌──────────────────────────────────────────────────────────────────┐
│ Extension (LucidChart / Miro)                                    │
│                                                                  │
│  "Sign In / Sign Up"                                             │
│     │                                                            │
│     ├─→ getOAuthToken('kinde') → Kinde hosted page (in popup)   │
│     │     ├─→ Existing user signs in → token returned            │
│     │     └─→ New user signs up (free tier) → token returned     │
│     │                                                            │
│  [User hits plan limit]                                          │
│     │                                                            │
│     └─→ "Upgrade your plan" → opens standalone website ──────┐  │
│                                                               │  │
└───────────────────────────────────────────────────────────────┼──┘
                                                                │
┌───────────────────────────────────────────────────────────────┼──┐
│ Standalone Website                                            ▼  │
│                                                                  │
│  Pricing Page → Plan Selection → Payment (Stripe) → Confirmation │
│                                                                  │
│  Account Settings:                                               │
│    - Profile, org/team management                                │
│    - Billing history, invoices                                   │
│    - Usage dashboard                                             │
│    - Subscription management                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Plan/Role Enforcement

The user's plan tier needs to be accessible from any surface to gate features. Two options:

| Approach | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Kinde roles/permissions** | Assign roles (e.g., `free`, `pro`, `enterprise`) in Kinde. Roles appear as claims in the JWT. | Standard, no extra API calls, works offline | Role changes require token refresh |
| **Custom API check** | Data connector looks up user's plan in a database when validating requests. | Real-time, can encode complex plan logic | Extra latency, requires plan database |

Recommended: **Kinde roles for coarse gating** (can the user submit a simulation at all?) + **API check for metered limits** (how many simulations remaining this month?). The extension reads the role from the JWT to show/hide UI, and the data connector enforces limits server-side.

---

## Current State

MSAL / Azure AD B2C is **not installed or implemented**. It was previously removed. What remains is:

### Auth Messaging Protocol (provider-agnostic, ready to use)

The shared library defines a complete auth message protocol that any auth provider can plug into:

| File | Contents |
|------|----------|
| `shared/src/quodsi-messaging/auth/messages.ts` | `AUTH_LOGIN_SUCCESS`, `AUTH_LOGOUT`, `AUTH_STATUS`, `AUTH_REQUIRED`, `AUTH_ERROR` message interfaces; `QuodsiUserInfo` type |
| `shared/src/quodsi-messaging/builders.ts` | `createAuthLoginSuccessMessage()`, `createAuthLogoutMessage()`, `createAuthStatusMessage()` |
| `shared/src/quodsi-messaging/envelope/envelopeMessageTypes.ts` | Enum entries for all auth message types |

**`QuodsiUserInfo` interface** (current shape):
```typescript
interface QuodsiUserInfo {
  id: string;           // Was intended for B2C objectId
  email: string;        // Primary sign-in address
  displayName?: string; // Friendly name
}
```

**`AUTH_LOGIN_SUCCESS` payload**:
```typescript
data: {
  idToken: string;       // JWT token
  user: QuodsiUserInfo;
  newUser: boolean;      // New user registration flag
}
```

### Data Connector — Optional Bearer Token

| File | What Exists |
|------|-------------|
| `dataconnectors/.../src/services/lucidApi.ts` | `simulateDocument()` accepts optional `authToken` param, sends as `Bearer` header |
| `dataconnectors/.../src/functions/dataConnectorHttpTrigger.ts` | CORS allows `Authorization` header; request validation uses Lucid SDK (not user auth) |

### React App — No Auth Integration

| File | Current State |
|------|--------------|
| `quodsim-react/src/index.tsx` | Comment: *"Always use model panel (auth has been removed)"* |
| `quodsim-react/src/App.tsx` | Uses `MessageProvider` only, no auth provider |
| No `authPolicies.ts` or `msalConfig.ts` | Config files don't exist |
| No auth handler in extension | `handlers/index.ts` has no `AuthHandler` registered |

### Extension — No Auth Handler

The extension's `MessageRouter` does not register an auth handler. Auth message types exist in the shared protocol but nothing processes them on the extension side.

---

## Architecture Decision: Extension Auth Approaches

For diagram-tool extensions (LucidChart, Miro), there are two ways to integrate Kinde. **Approach B is recommended** for extensions; Approach A applies to the standalone website.

### Approach A: Kinde SDK in the React Panel

The React app (running inside the host platform's iframe) uses `@kinde-oss/kinde-auth-react` directly.

**Best for:** Standalone website (no iframe constraints).

**Flow:**
```
User clicks "Sign In" in React app
  → Kinde SDK initiates redirect/popup
  → User authenticates with Kinde
  → Kinde redirects back
  → React gets token and user info directly
```

**Pros:**
- Full Kinde React SDK features (user management, org switching, roles)
- Direct token and user info access
- Standard integration pattern

**Cons (in extension context):**
- **Iframe is the problem.** Extensions embed React in an iframe. Browser popup blockers may block auth popups. Redirect flow navigates the iframe away. Third-party cookie/storage restrictions break token persistence.
- You manage token storage and refresh
- More code to write and maintain

### Approach B: Kinde as Platform OAuth Provider (Recommended for Extensions)

Register Kinde as an OAuth provider in the host platform's manifest. The **extension** handles auth using the platform's built-in OAuth APIs.

**Best for:** LucidChart extension (and likely Miro).

**Flow:**
```
User triggers "Sign In" (or extension needs auth for a protected operation)
  → Extension calls platform OAuth API (e.g., Lucid's getOAuthToken('kinde'))
  → Platform handles OAuth consent popup natively (NOT in the iframe)
  → Platform stores encrypted token server-side
  → Extension receives token, extracts user info from JWT claims
  → Extension sends AUTH_LOGIN_SUCCESS to React panel via postMessage
  → React updates UI with user info
```

**LucidChart manifest configuration:**
```json
{
  "oauthProviders": [
    {
      "name": "kinde",
      "title": "Censio",
      "grantType": "authorizationCode",
      "authorizationUrl": "https://<your-app>.kinde.com/oauth2/auth",
      "tokenUrl": "https://<your-app>.kinde.com/oauth2/token",
      "scopes": ["openid", "profile", "email"],
      "domainWhitelist": ["https://<your-app>.kinde.com"],
      "usePkce": true
    }
  ]
}
```

**Key Lucid SDK methods:**
```typescript
const client = new EditorClient();

// Get user's Kinde token (prompts for consent if needed)
const token = await client.getOAuthToken('kinde');

// Make authenticated API call to Kinde (e.g., fetch user profile)
const result = await client.oauthXhr('kinde', {
  url: 'https://<your-app>.kinde.com/oauth2/v2/user_profile',
  method: 'GET',
});

// Get the OAuth client ID
const clientId = await client.getOAuthClientId('kinde');
```

**Pros:**
- **Bypasses all iframe auth issues.** Platform handles OAuth natively.
- Tokens encrypted and stored server-side by the platform
- Token refresh handled by platform
- Less code — no `KindeProvider`, no React auth hooks, no token management
- Credentials managed via platform developer portal or `.credentials.local` file

**Cons:**
- Token lives in the extension, not React — passed via postMessage
- No direct Kinde React SDK features in the panel
- Depends on host platform's OAuth API
- Less control over consent UX

### Why Approach B for Extensions

1. **The iframe problem is real.** Modern browsers block third-party cookies and partition iframe storage. This causes auth failures. Approach B sidesteps it.
2. **Aligns with platform architecture.** Both Lucid and Miro designed their extension SDKs for this pattern.
3. **The existing auth messaging protocol fits.** `AUTH_LOGIN_SUCCESS` flows from extension → React. The extension is the auth authority.
4. **Less surface area.** No Kinde SDK dependency in the extension's React panel.

---

## Integration with LucidChart Bootstrap Flow

The extension has an 8-stage bootstrap process (see `_docs/architecture/bootstrap/`). Auth does **not** change or block any existing stage — it slots in after the system is operational.

### Bootstrap Stages (existing, unchanged)

```
Stage 1: Extension Load        — EditorClient, Viewport created
Stage 2: Singleton Init         — StorageAdapter, ModelManager, MessageRouter
Stage 3: Panel Creation         — RightDockPanel instantiated, registered with MessageRouter
Stage 4: Selection Handler      — viewport.hookSelection() wired up
          ↓
     [User clicks panel icon]
          ↓
Stage 5: React App Load         — iframe created, quodsim-react mounted
Stage 6: React Initialization   — MessageProvider, effects, ref tracking
Stage 7: Communication Handshake — REACT_APP_READY → markChannelReady → flushQueue
Stage 8: Operational State       — bidirectional messaging active
```

### Auth integration points

**Stage 2 — Register auth handler (no auth triggered yet):**

```typescript
// extension.ts — after existing singleton init
ModelManager.initialize(client, storageAdapter);
initializeMessaging(true);

// New: AuthHandler registers with MessageRouter like any other handler.
// It holds a reference to EditorClient for getOAuthToken() calls.
// No auth flow is triggered at this point.
```

**Stage 7 — Non-blocking auth check after handshake completes:**

In `MessageRouter.handleReactAppReady()`, after the existing steps:

```typescript
// Existing steps (unchanged):
this.channelManager.markChannelReady(role);      // Step 3
this.channelManager.flushQueue(role);             // Step 5
this.requestModelContext(role);                    // Step 6

// New Step 7: Check if user has a cached Kinde token
// This is NON-BLOCKING — if no cached token, panel renders
// in unauthenticated state. No popup shown automatically.
this.checkAndBroadcastAuthStatus(role);
```

`checkAndBroadcastAuthStatus()` calls `client.getOAuthToken('kinde')`. If the user previously authorized, Lucid returns the cached token instantly → extension decodes JWT → broadcasts `AUTH_STATUS(true, user)` to React. If not authorized, broadcasts `AUTH_STATUS(false)` — React shows "Sign In" button.

**React panel — on-demand auth trigger:**

When user clicks "Sign In" in the React panel:

```typescript
// React sends message to extension
sendMessage(EnvelopeMessageType.AUTH_REQUIRED, { reason: 'not_authenticated' });
```

Extension's `AuthHandler` receives this and calls `getOAuthToken('kinde')` — Lucid shows the native consent popup (outside the iframe). On success:

```typescript
const token = await client.getOAuthToken('kinde');
const claims = decodeJWT(token);  // Extract sub, email, given_name

router.send('model', createAuthStatusMessage(true, {
  id: claims.sub,
  email: claims.email,
  displayName: claims.given_name
}));
```

**Protected operations — auth gating in existing handlers:**

`SimulationHandler` / `SimulationRunHandler` check auth before submission:

```typescript
// Before submitting simulation
const token = await client.getOAuthToken('kinde');
if (!token) {
  router.send('model', createAuthRequiredMessage('not_authenticated'));
  return;
}
// Pass token to data connector via existing authToken parameter
```

### What does NOT change

| Component | Changes? | Why |
|-----------|----------|-----|
| Stages 1-4 (extension bootstrap) | No | AuthHandler registers like any other handler |
| Stages 5-6 (React bootstrap) | No | React doesn't manage auth, just displays state |
| Stage 7 (REACT_APP_READY handshake) | Small addition | Non-blocking auth check appended after existing steps |
| Stage 8 (operational state) | No | Auth is just another message type through existing channels |
| Emergency timer (3s fallback) | No | Auth is NOT a readiness condition — never blocks REACT_APP_READY |
| Message queue system | No | Auth messages queue/flush like any other message |
| Panel recovery mechanism | No | AuthHandler doesn't create new panels |

### Timing

```
0ms      Extension loads (Stages 1-4)
...      User clicks panel icon
0ms      React mounts (Stage 5-6)
~200ms   REACT_APP_READY sent (Stage 7)
~210ms   handleReactAppReady: flush queue, request model context
~220ms   checkAndBroadcastAuthStatus (new):
           ├─ Cached token? → AUTH_STATUS(true, user) → React shows user info
           └─ No token?     → AUTH_STATUS(false)      → React shows "Sign In"
...      User clicks "Sign In" (if needed)
~500ms   Lucid consent popup appears (native, outside iframe)
...      User authorizes
~200ms   Token returned → AUTH_STATUS(true, user) → React updates
```

### React state changes

The `MessageProvider` reducer needs one addition — an `auth` slice:

```typescript
// State shape addition:
{
  app: { initialized: boolean, panelType?: 'model' },
  auth: { isAuthenticated: boolean, user?: QuodsiUserInfo },  // NEW
  selection: { ... },
  simulation: { ... },
  validation: { ... }
}

// Reducer case:
case EnvelopeMessageType.AUTH_STATUS:
  return { ...state, auth: {
    isAuthenticated: action.data.isAuthenticated,
    user: action.data.user
  }};
```

UI components read `auth.isAuthenticated` and `auth.user` to conditionally render sign-in buttons, user info, and gate simulation controls.

---

## What Needs to Be Built

### Phase 1: LucidChart Extension (Approach B)

#### 1. Kinde Application Setup (External)

- Create a Kinde application (type: Regular Web Application — Lucid's server handles token exchange)
- Configure redirect URIs per Lucid's OAuth callback requirements
- Enable OpenID Connect scopes: `openid`, `profile`, `email`
- Record client ID and secret for Lucid Developer Portal

#### 2. Lucid Manifest Updates

| Task | Details |
|------|---------|
| Add Kinde `oauthProvider` to all manifests | `manifest_local.json`, `manifest_dev.json`, `manifest_test.json`, `manifest_prod.json` |
| Configure credentials locally | Create `kinde.credentials.local` file with `clientId` and `clientSecret` |
| Configure credentials for deploy | Enter client ID/secret in Lucid Developer Portal OAuth settings |

#### 3. Extension — Auth Handler & Token Management

| Task | Details |
|------|---------|
| Create `authHandler.ts` | Call `client.getOAuthToken('kinde')` to initiate auth; decode JWT for user info |
| Register in `handlers/index.ts` | Add to MessageRouter |
| Auth state management | Store authenticated user info, broadcast `AUTH_STATUS` to all panels |
| Gate protected operations | Call `getOAuthToken('kinde')` before simulation submission; send `AUTH_REQUIRED` on failure |
| Handle token in API calls | Pass token to data connector via existing `authToken` parameter |

#### 4. Shared Library — Possible Updates

| Task | Details |
|------|---------|
| Review `QuodsiUserInfo` | Map Kinde JWT claims (`sub`, `email`, `given_name`, `family_name`) to interface fields |
| Review `AUTH_LOGIN_SUCCESS` | `idToken` field name works. Verify `newUser` can be determined (may need a Kinde API call or custom claim) |
| Update `builders.ts` | Only if payload types change |

#### 5. React App — Auth UI (Minimal for Extension)

| Task | Details |
|------|---------|
| Display auth state | Show user name/email when authenticated, "Sign In" button when not |
| Handle `AUTH_STATUS` messages | Update UI based on auth state broadcast from extension |
| Trigger auth from React | Send message to extension requesting auth → extension calls `getOAuthToken('kinde')` |
| **No Kinde SDK needed** | React does not manage auth directly — just displays state and triggers requests |

#### 6. Data Connector — Token Validation

| Task | Details |
|------|---------|
| Install `@kinde-oss/kinde-typescript-sdk` | Add to data connector `package.json` |
| Validate Kinde JWT | Verify tokens arriving from any surface (LucidChart, standalone website, Miro) |
| JWKS endpoint | Use Kinde's `/.well-known/jwks.json` for token verification |

### Phase 2: Standalone Website (Approach A)

| Task | Details |
|------|---------|
| Install `@kinde-oss/kinde-auth-react` | Standard React SDK |
| `KindeProvider` setup | Domain, clientId, redirectUri, logoutUri |
| Full auth UX | Login/logout, user profile, org switching (if needed) |
| Kinde client type | SPA (authorization code + PKCE) |
| Share `QuodsiUserInfo` | Same shared library interface, mapped from Kinde claims |

### Phase 3: Miro Extension (Approach B variant)

| Task | Details |
|------|---------|
| Research Miro SDK auth | Determine if Miro has equivalent of Lucid's `getOAuthToken()` |
| Register Kinde as Miro OAuth provider | Platform-specific manifest/config |
| Kinde client type | TBD based on Miro's token exchange model |
| Reuse auth handler pattern | Same `AUTH_LOGIN_SUCCESS` → React broadcast pattern |

---

## Stale Documentation to Update

These docs reference MSAL as if it's implemented. They should be updated or removed:

| File | What's Wrong |
|------|-------------|
| `editorextensions/.../quodsim-react/README.md` | Lists MSAL as a current feature (line 135) |
| `editorextensions/.../_docs/architecture/messaging/auth/README.md` | Describes MSAL OAuth flows as current |
| `editorextensions/.../_docs/architecture/messaging/auth/auth-status.md` | References MSAL cache, token refresh |
| `editorextensions/.../_docs/architecture/messaging/auth/auth-login-logout.md` | Describes MSAL login/logout flows |
| `editorextensions/.../_docs/architecture/messaging/framework/react-app-ready.md` | References MSAL initialization |
| `editorextensions/.../_docs/architecture/environment/README.md` | References msalConfig.ts, authPolicies.ts, MSAL redirect URIs |
| `editorextensions/.../_docs/architecture/environment/05_common_gotchas.md` | MSAL troubleshooting (stale tokens, redirect URI mismatches) |
| `editorextensions/.../_docs/architecture/environment/01_react_environment.md` | References MSAL authentication |
| `editorextensions/.../_docs/architecture/environment/02_manifest_configuration.md` | References MSAL authentication |
| `_docs/future_specs/authentication system requirements/01_Overview.md` | Describes Azure AD B2C as the auth provider |
| `_docs/future_specs/authentication system requirements/02_Basic Authentication Requirements.md` | MSAL initialization requirements |
| `_docs/future_specs/authentication system requirements/model panel 101.md` | MSAL sequence diagrams |

---

## Next Steps

1. [ ] Create Kinde tenant and application for Censio
2. [ ] Add Kinde as `oauthProvider` in `manifest_local.json` and test `getOAuthToken('kinde')` from the extension
3. [ ] Prototype: extension gets token → decodes JWT → sends `AUTH_LOGIN_SUCCESS` → React displays user info
4. [ ] Decide on `QuodsiUserInfo` field mapping from Kinde JWT claims
5. [ ] Build full auth handler with gated operations
6. [ ] Add Kinde JWT validation to data connector
7. [ ] Update or remove stale MSAL documentation listed above
8. [ ] Research Miro extension SDK auth capabilities for Phase 3
