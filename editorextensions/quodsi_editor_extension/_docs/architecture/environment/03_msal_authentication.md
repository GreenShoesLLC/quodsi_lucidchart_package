# 03. MSAL Authentication Configuration

Complete reference for Microsoft Authentication Library (MSAL) configuration and how environment affects authentication behavior.

---

## Overview

The React app uses **MSAL (Microsoft Authentication Library)** for Azure AD B2C authentication:
- Tenant configuration is **hard-coded** in source files
- Redirect URI changes based on **runtime environment detection**
- Cache settings adapt to iframe vs standalone context
- B2C policies control sign-in, password reset, profile editing

**Key point:** Most MSAL config is NOT in environment variables - it's in TypeScript source files.

---

## Configuration Files

### authPolicies.ts (Hard-coded Configuration)

**Location:** `quodsim-react/src/config/authPolicies.ts`

**Purpose:** Tenant, client ID, B2C policies, API scopes

**Content:**
```typescript
export const tenantConfig = {
  name: 'quodsidevb2c',
  domain: 'quodsidevb2c.onmicrosoft.com',
  authorityDomain: 'quodsidevb2c.b2clogin.com',
  clientId: '71597220-4889-4c06-8c08-152dfae2082b'
};

export const b2cPolicies = {
  signUpSignIn: "B2C_1_SignUpSignIn_EmailOnly_Dev",
  forgotPassword: "B2C_1_PasswordReset_EmailOnly_Dev",
  editProfile: "B2C_1_ProfileEdit_Dev"
};

export const apiScopes = [
  "https://quodsidevb2c.onmicrosoft.com/api/Data.Read",
  "https://quodsidevb2c.onmicrosoft.com/api/Data.Write",
  "https://quodsidevb2c.onmicrosoft.com/api/Simulation.Run"
];
```

**NOT environment variables** - these are JavaScript constants

**To change:** Must edit source file and rebuild React app

---

### msalConfig.ts (Runtime Configuration)

**Location:** `quodsim-react/src/config/msalConfig.ts`

**Purpose:** Runtime-detected redirect URIs and cache settings

**Key function:** `getRedirectUri()`
```typescript
export const getRedirectUri = (): string => {
  const currentUrl = window.location.href;

  // Extension development (Terminal 4)
  if (currentUrl.includes('localhost:9900')) {
    return 'http://localhost:9900/resources/quodsim-react/index.html';
  }

  // Lucid production
  if (currentUrl.includes('lucid.app') || currentUrl.includes('lucidchart.com')) {
    return currentUrl; // Use the exact current URL
  }

  // React standalone development (Terminal 3 only)
  return 'http://localhost:3000/';
};
```

**Environment detection is automatic** - based on `window.location.href`

---

## Tenant Configuration (Hard-coded)

### Tenant Name

**Value:** `quodsidevb2c`

**Full domain:** `quodsidevb2c.onmicrosoft.com`

**Authority domain:** `quodsidevb2c.b2clogin.com`

**This is the Azure AD B2C tenant** - not changeable without code changes

---

### Client ID

**Value:** `71597220-4889-4c06-8c08-152dfae2082b`

**Purpose:** Identifies Quodsi application in Azure AD B2C

**Registered in:** Azure Portal → Azure AD B2C → App registrations

**Not environment-specific** - same client ID for all environments (dev/test/prod)

**Why?** Azure AD B2C is separate from application environments

---

## B2C Policies (Hard-coded)

### Sign-Up/Sign-In Policy

**Name:** `B2C_1_SignUpSignIn_EmailOnly_Dev`

**Purpose:** Combined sign-up and sign-in flow

**Authentication methods:** Email only (no social login)

**Used when:** User clicks "Login" button

**Authority URL:**
```
https://quodsidevb2c.b2clogin.com/quodsidevb2c.onmicrosoft.com/B2C_1_SignUpSignIn_EmailOnly_Dev/v2.0
```

---

### Password Reset Policy

**Name:** `B2C_1_PasswordReset_EmailOnly_Dev`

**Purpose:** Self-service password reset

**Used when:** User forgets password during login

**Authority URL:**
```
https://quodsidevb2c.b2clogin.com/quodsidevb2c.onmicrosoft.com/B2C_1_PasswordReset_EmailOnly_Dev/v2.0
```

---

### Profile Edit Policy

**Name:** `B2C_1_ProfileEdit_Dev`

**Purpose:** Allow users to edit their profile

**Used when:** User accesses profile settings (if implemented)

**Authority URL:**
```
https://quodsidevb2c.b2clogin.com/quodsidevb2c.onmicrosoft.com/B2C_1_ProfileEdit_Dev/v2.0
```

---

## API Scopes (Hard-coded)

**Defined scopes:**
```typescript
[
  "https://quodsidevb2c.onmicrosoft.com/api/Data.Read",
  "https://quodsidevb2c.onmicrosoft.com/api/Data.Write",
  "https://quodsidevb2c.onmicrosoft.com/api/Simulation.Run"
]
```

**Purpose:** Permissions requested from user during login

**Registered in:** Azure AD B2C → API permissions

**Required for:** Accessing Quodsi backend APIs

---

## Redirect URI Logic (Runtime Detection)

### Scenario 1: Extension Development (localhost:9900)

**Detection:** `window.location.href` contains `'localhost:9900'`

**Redirect URI:** `http://localhost:9900/resources/quodsim-react/index.html`

**When it happens:**
- Running Terminal 4 (extension test mode)
- React app loaded in LucidChart panel (iframe)
- Extension serves React build from resources/

**Why this URI:**
- MSAL redirects to this path after authentication
- Must match Azure AD B2C app registration redirect URIs

---

### Scenario 2: React Standalone (localhost:3000)

**Detection:** Default fallback (no other conditions matched)

**Redirect URI:** `http://localhost:3000/`

**When it happens:**
- Running Terminal 3 only (React dev server)
- No extension, no LucidChart
- Testing React app standalone in browser

**Why this URI:**
- Simplest case - React app at root
- Must be registered in Azure AD B2C

---

### Scenario 3: Lucid Production (lucid.app)

**Detection:** `window.location.href` contains `'lucid.app'` or `'lucidchart.com'`

**Redirect URI:** `currentUrl` (the exact current URL)

**When it happens:**
- Deployed extension in Lucid
- Production or test environments
- URL is dynamic based on LucidChart document

**Why this URI:**
- LucidChart embeds extension in unique URLs
- Must use exact current URL for iframe context
- Example: `https://lucid.app/documents/embeddedSession/...`

---

## Cache Settings

### sessionStorage vs localStorage

**Function:** `getCacheSettings()`
```typescript
export const getCacheSettings = () => {
  return {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: isInIframe(),
  };
};
```

**Cache location:** Always `sessionStorage` (not `localStorage`)

**Why sessionStorage?**
- Clears when browser tab closes
- More secure (less persistent)
- Suitable for enterprise scenarios

---

### Cookies for iframe

**Function:** `isInIframe()`
```typescript
export const isInIframe = (): boolean => {
  try {
    return window !== window.parent;
  } catch (e) {
    return true; // Cross-origin error means we're in iframe
  }
};
```

**Setting:** `storeAuthStateInCookie: isInIframe()`

**Why?**
- Safari and some browsers restrict sessionStorage in iframes
- Cookies work cross-frame
- MSAL fallback for iframe contexts

**When true:**
- Extension running in LucidChart panel (always iframe)
- Terminal 4 scenario

**When false:**
- React standalone development (Terminal 3 only)

---

## MSAL System Settings

### iframe Configuration

**Settings:**
```typescript
system: {
  allowRedirectInIframe: true,  // Enable for Lucidchart environment
  windowHashTimeout: 60000,     // 60 seconds
  iframeHashTimeout: 6000,      // 6 seconds
  loadFrameTimeout: 6000,       // 6 seconds
}
```

**`allowRedirectInIframe: true`**
- **Critical for LucidChart:** Extension runs in iframe
- Default MSAL blocks iframe redirects (security)
- Must enable for Lucid integration

---

### Logger Options

**Configuration:**
```typescript
loggerOptions: {
  loggerCallback: (level, message, containsPii) => {
    if (containsPii) return;
    switch (level) {
      case 0: console.error(`[MSAL] ${message}`); break;
      case 1: console.warn(`[MSAL] ${message}`); break;
      case 2: console.info(`[MSAL] ${message}`); break;
      case 3: console.debug(`[MSAL] ${message}`); break;
    }
  },
  piiLoggingEnabled: false,
  logLevel: 2,  // Info level
}
```

**Log level:** `2` (Info) - balance between noise and debugging

**PII logging:** Disabled (security best practice)

---

## Environment-Specific Behavior

### Local Development

**Environment:** Terminal 3 + Terminal 4 running

**Redirect URI:** `http://localhost:9900/resources/quodsim-react/index.html`

**Cache:** sessionStorage + cookies (iframe context)

**Login flow:**
1. User clicks Login in panel
2. MSAL opens popup (or redirects)
3. User authenticates with B2C
4. Redirects to localhost:9900/resources/quodsim-react/index.html
5. MSAL processes token
6. React app receives auth state

**Gotcha:** If redirect fails, check Azure AD B2C has this URI registered

---

### React Standalone Development

**Environment:** Terminal 3 only (no extension)

**Redirect URI:** `http://localhost:3000/`

**Cache:** sessionStorage only (not iframe)

**Login flow:**
1. User clicks Login
2. MSAL opens popup (preferred) or redirects
3. User authenticates
4. Redirects to localhost:3000/
5. Token processed

**Use case:** Developing auth UI without full extension

---

### Production (Lucid)

**Environment:** Deployed extension on lucid.app

**Redirect URI:** Dynamic (current URL)

**Cache:** sessionStorage + cookies (iframe)

**Login flow:**
1. User in LucidChart document
2. Opens Quodsi panel
3. Clicks Login
4. MSAL popup or redirect
5. Returns to exact same LucidChart document URL
6. Token processed

**Gotcha:** Azure AD B2C must accept wildcard: `https://lucid.app/*`

---

## Common Issues

### Issue: Redirect URI Mismatch

**Symptoms:**
- After login, error: "AADB2C90090: The provided redirect_uri is not registered"
- Login succeeds but never returns to app

**Cause:** Redirect URI not registered in Azure AD B2C

**Fix:**
1. Go to Azure Portal
2. Azure AD B2C → App registrations → Quodsi app
3. Authentication → Platform configurations → Single-page application
4. Add redirect URI:
   - `http://localhost:9900/resources/quodsim-react/index.html`
   - `http://localhost:3000/`
   - `https://lucid.app/*` (wildcard)

---

### Issue: Cached Login State

**Symptoms:**
- Logged in as wrong user
- "Already logged in" but shows old user
- Can't log out

**Cause:** sessionStorage or cookies retain old tokens

**Fix:**
```javascript
// In browser console
sessionStorage.clear();

// Or:
// Application tab → Storage → Clear site data
```

**Or use incognito mode for clean testing**

---

### Issue: Popup Blocked

**Symptoms:**
- Login button does nothing
- Console error: "Popup blocked"

**Cause:** Browser popup blocker

**Fix:**
- Allow popups for localhost and lucid.app
- Or: MSAL will fall back to redirect flow (slower but works)

---

### Issue: iframe Authentication Fails

**Symptoms:**
- Login fails only in LucidChart (works standalone)
- Error about storage access

**Cause:** Browser blocks third-party cookies/storage in iframe

**Fix:**
- Already handled by `storeAuthStateInCookie: isInIframe()`
- If still failing: Check `allowRedirectInIframe: true` is set
- Safari: May need to enable cross-site tracking (dev only)

---

### Issue: Wrong Tenant

**Symptoms:**
- Login prompts for different organization
- Can't find users

**Cause:** Wrong tenant configuration in code

**Fix:**
1. Verify `authPolicies.ts` has correct tenant:
   ```typescript
   name: 'quodsidevb2c',
   domain: 'quodsidevb2c.onmicrosoft.com',
   ```
2. Rebuild React app
3. Clear browser cache

---

## Debugging MSAL

### Enable Verbose Logging

**Temporarily change log level in `msalConfig.ts`:**
```typescript
loggerOptions: {
  logLevel: 3,  // Verbose (change from 2)
}
```

**Rebuild and check console** - will see all MSAL operations

---

### Check Redirect URI

**In browser console after login attempt:**
```javascript
// Check what MSAL thinks redirect URI is
console.log(window.location.href);

// Should match one of the registered URIs:
// - http://localhost:9900/resources/quodsim-react/index.html
// - http://localhost:3000/
// - https://lucid.app/...
```

---

### Inspect Token

**After successful login:**
```javascript
// Browser console
const accounts = msalInstance.getAllAccounts();
console.log(accounts);

// Check token expiry
const account = accounts[0];
console.log("Token expires:", new Date(account.idTokenClaims.exp * 1000));
```

---

### Test Redirect URI Logic

**In browser console:**
```javascript
// Copy getRedirectUri function from msalConfig.ts
const getRedirectUri = () => {
  const currentUrl = window.location.href;
  console.log("Current URL:", currentUrl);

  if (currentUrl.includes('localhost:9900')) {
    return 'http://localhost:9900/resources/quodsim-react/index.html';
  }

  if (currentUrl.includes('lucid.app') || currentUrl.includes('lucidchart.com')) {
    return currentUrl;
  }

  return 'http://localhost:3000/';
};

console.log("Redirect URI:", getRedirectUri());
```

---

## Changing MSAL Configuration

### To Change Tenant/Client ID

**IMPORTANT:** Rare operation - only if setting up new Azure AD B2C

1. Edit `authPolicies.ts`:
   ```typescript
   export const tenantConfig = {
     name: 'your-new-tenant',
     domain: 'your-new-tenant.onmicrosoft.com',
     authorityDomain: 'your-new-tenant.b2clogin.com',
     clientId: 'your-new-client-id'
   };
   ```

2. Rebuild React app:
   ```bash
   cd quodsim-react
   npm run build
   ```

3. Clear browser cache and sessionStorage

4. Test login flow

---

### To Change B2C Policies

**Why:** Different user flows (e.g., add social login)

1. Create new policy in Azure AD B2C
2. Edit `authPolicies.ts`:
   ```typescript
   export const b2cPolicies = {
     signUpSignIn: "B2C_1_YourNewPolicy",
     // ...
   };
   ```
3. Rebuild React app

---

### To Add Redirect URI

**For new environment (e.g., staging):**

1. Edit `msalConfig.ts` → `getRedirectUri()`:
   ```typescript
   if (currentUrl.includes('staging.example.com')) {
     return 'https://staging.example.com/app/';
   }
   ```

2. Register URI in Azure AD B2C

3. Rebuild and test

---

## Best Practices

### DO

✅ Test login in all contexts (standalone, iframe, production)
✅ Use incognito mode for fresh auth testing
✅ Check browser console for MSAL logs
✅ Verify redirect URIs registered in Azure AD B2C
✅ Clear sessionStorage between major testing sessions

### DON'T

❌ Hard-code redirect URIs without environment detection
❌ Disable `allowRedirectInIframe` (breaks LucidChart)
❌ Store sensitive data in localStorage (use sessionStorage)
❌ Commit credentials or secrets (tenant/client ID are OK)
❌ Change tenant config lightly (big operation)

---

## Related Documentation

- [01. React Environment](./01_react_environment.md) - Environment variables
- [02. Manifest Configuration](./02_manifest_configuration.md) - Extension configuration
- [05. Common Gotchas](./05_common_gotchas.md) - Auth issues when returning to project

---

## Quick Reference

| Config | Value | File | Changeable? |
|--------|-------|------|-------------|
| Tenant | quodsidevb2c | authPolicies.ts | Rarely |
| Client ID | 71597220-... | authPolicies.ts | Rarely |
| Redirect URI (dev) | localhost:9900/... | msalConfig.ts (runtime) | Code change |
| Redirect URI (standalone) | localhost:3000/ | msalConfig.ts (runtime) | Code change |
| Cache location | sessionStorage | msalConfig.ts | Code change |
| Allow iframe redirect | true | msalConfig.ts | Code change |
| B2C policies | B2C_1_SignUpSignIn_... | authPolicies.ts | Rarely |

**Most common issue when returning:** Cached auth state. Clear sessionStorage first!
