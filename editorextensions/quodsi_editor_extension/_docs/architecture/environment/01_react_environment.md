# 01. React Environment Variables

Complete reference for all environment variables used by the React app (quodsim-react).

---

## Overview

The React app uses **Create React App** conventions:
- Environment variables **must** start with `REACT_APP_`
- Loaded from `.env` files based on `NODE_ENV`
- Build-time only (not runtime - values baked into bundle)
- File precedence: `.env.local` > `.env.[mode]` > `.env`

---

## Environment Variables

### REACT_APP_DATA_CONNECTOR_API_URL

**Purpose:** URL for Azure Function data connector API

**Type:** String (URL)

**Used in:**
- API calls to data connector
- Simulation submission
- Model upload
- Status polling

**Values by environment:**

```bash
# Local development
REACT_APP_DATA_CONNECTOR_API_URL=http://localhost:7071/api/

# Dev Azure
REACT_APP_DATA_CONNECTOR_API_URL=https://dev-quodsi-func-v1.azurewebsites.net/api/

# Test Azure
REACT_APP_DATA_CONNECTOR_API_URL=https://tst-quodsi-func-v1.azurewebsites.net/api/

# Production Azure
REACT_APP_DATA_CONNECTOR_API_URL=https://prd-quodsi-func-v1.azurewebsites.net/api/
```

**Current files:**
- `.env.production`: `https://dev-quodsi-func-v1.azurewebsites.net/api/`
- Other files: Not set

**Impact if wrong:**
- Simulation submission fails
- Status updates don't work
- Model upload fails
- CORS errors in console

---

### REACT_APP_AZURE_STATUS_FUNCTION_KEY

**Purpose:** Function key for Azure status endpoint authentication

**Type:** String (Azure Function key)

**Used in:**
- Status polling requests
- Authenticating with Azure Function

**Values:**
```bash
REACT_APP_AZURE_STATUS_FUNCTION_KEY=zwH0vpBDPYko4QfIbNC9TjJRu4gZP9wbWu8CHuLFMrUkAzFuTazGeg==
```

**Current files:**
- `.env.production`: Set to dev function key
- Other files: Not set

**Impact if wrong:**
- Status polling returns 401 Unauthorized
- Can't check simulation progress

**Security note:** This is a dev key, safe to commit. Production keys should not be in .env files.

---

### REACT_APP_API_BASE_URL

**Purpose:** Base URL for Quodsi API (legacy/future use)

**Type:** String (URL)

**Used in:**
- `authApiConfig.ts` configuration

**Default value:**
```bash
REACT_APP_API_BASE_URL=https://quodsi-api-dev.azurewebsites.net
```

**Current status:** Not actively used in most API calls

---

### REACT_APP_QUODSI_FASTAPI_URL

**Purpose:** FastAPI backend URL (if using FastAPI instead of Azure Functions)

**Type:** String (URL)

**Used in:**
- `quodsiFastApiConfig.ts` configuration

**Default value:**
```bash
REACT_APP_QUODSI_FASTAPI_URL=http://localhost:8000
```

**Current status:** Alternative backend, not primary

---

### NODE_ENV

**Purpose:** Build mode for React app

**Type:** Enum (`development` | `production` | `test`)

**Set by:** npm scripts automatically

**Values:**
- `development` - When running `npm start` or `react-scripts start`
- `production` - When running `npm run build` or `react-scripts build`
- `test` - When running `npm test` or `react-scripts test`

**Impact:**
```typescript
// Affects logging
enableLogging: process.env.NODE_ENV === 'development'

// Affects dev tools
enableDevTools: process.env.NODE_ENV === 'development'

// Conditional UI features
const isDevelopment = process.env.NODE_ENV === 'development';
```

**Used in:**
- `index.tsx` - Logging and dev tools
- `authApiConfig.ts` - API configuration
- Multiple components - Debug panels, logging
- `MessageProvider.tsx` - Message logging

**You cannot set this manually** - it's controlled by the npm script you run.

---

### DISABLE_ESLINT_PLUGIN

**Purpose:** Disable ESLint plugin during build/development

**Type:** Boolean string (`"true"` | `"false"`)

**Set in:** `.env` (base file)

**Value:**
```bash
DISABLE_ESLINT_PLUGIN=true
```

**Impact:**
- Faster builds
- No ESLint errors blocking compilation
- Still can run ESLint manually: `npm run lint`

**Why enabled:** Speeds up development, ESLint checked in IDE/CI instead

---

## .env File Precedence

### Loading Order

When React app starts, Create React App loads `.env` files in this order (last wins):

1. `.env` - Base configuration for all environments
2. `.env.local` - Local overrides (gitignored, never committed)
3. `.env.[mode]` - Mode-specific (`.env.development`, `.env.production`, `.env.test`)
4. `.env.[mode].local` - Mode-specific local overrides (gitignored)

**Example:** Running `npm start` (development mode):
1. Load `.env`
2. Load `.env.local` (overrides .env)
3. Load `.env.development` (overrides both)
4. Load `.env.development.local` (overrides all)

**Example:** Running `npm run build` (production mode):
1. Load `.env`
2. Load `.env.local` (overrides .env)
3. Load `.env.production` (overrides both)
4. Load `.env.production.local` (overrides all)

---

## Current .env Files

### .env (Base Configuration)

**Location:** `quodsim-react/.env`

**Content:**
```bash
DISABLE_ESLINT_PLUGIN=true
```

**Purpose:** Base config for all environments

**Committed:** Yes

---

### .env.local (Local Overrides)

**Location:** `quodsim-react/.env.local`

**Content:** Empty currently

**Purpose:** Override any variable locally without committing changes

**Committed:** No (in .gitignore)

**Use cases:**
- Testing different API URLs
- Temporary feature flags
- Local secrets

**Example content:**
```bash
# Test against different backend
REACT_APP_DATA_CONNECTOR_API_URL=http://localhost:8080/api/

# Enable extra logging
REACT_APP_DEBUG=true
```

---

### .env.development (Development Mode)

**Location:** `quodsim-react/.env.development`

**Content:** Empty currently

**Purpose:** Variables for `npm start` mode

**Committed:** Yes

**When loaded:** Running `npx react-scripts start`

---

### .env.test (Test Mode)

**Location:** `quodsim-react/.env.test`

**Content:** Empty currently

**Purpose:** Variables for `npm test` mode

**Committed:** Yes

**When loaded:** Running `npm test`

---

### .env.production (Production Mode)

**Location:** `quodsim-react/.env.production`

**Content:**
```bash
REACT_APP_DATA_CONNECTOR_API_URL=https://dev-quodsi-func-v1.azurewebsites.net/api/
REACT_APP_AZURE_STATUS_FUNCTION_KEY=zwH0vpBDPYko4QfIbNC9TjJRu4gZP9wbWu8CHuLFMrUkAzFuTazGeg==
```

**Purpose:** Variables for production builds

**Committed:** Yes

**When loaded:**
- Running `npm run build`
- Building for deployment

**Note:** Despite being ".production", this points to **dev Azure** - this is for testing production builds against dev backend.

---

## How React Accesses Variables

### At Build Time

Environment variables are **baked into the JavaScript bundle** during build:

```typescript
// This code in React:
const apiUrl = process.env.REACT_APP_DATA_CONNECTOR_API_URL;

// Becomes this in built bundle:
const apiUrl = "https://dev-quodsi-func-v1.azurewebsites.net/api/";
```

**Implications:**
- Cannot change environment variables at runtime
- Must rebuild React app to change variables
- Variables visible in browser (not secret storage)

---

### In Development Mode (npm start)

**Hot reload works** - changes to `.env` files require:
1. Stop React dev server (Ctrl+C)
2. Restart: `npx react-scripts start`

Changes to React code hot reload, but **not** changes to .env files.

---

## Common Scenarios

### Scenario 1: Local Development (Full Stack)

**Goal:** Run everything locally

**.env file:** `.env.local` (create if doesn't exist)

**Content:**
```bash
# Leave empty or add:
# REACT_APP_DATA_CONNECTOR_API_URL=http://localhost:7071/api/
```

**Why:** Default fallback in code already uses localhost:7071

**Manifest needed:** `manifest_local.json` (callbackBaseUrl: http://localhost:7071)

**Services required:**
- Terminal 2: Azure Function on port 7071
- Terminal 3: React on port 3000
- Terminal 4: Extension on port 9900

---

### Scenario 2: React-Only Development

**Goal:** Work on UI without backend

**.env file:** `.env.development` (already exists, empty is fine)

**Run:** `npx react-scripts start`

**What works:** UI, layout, components, styling

**What doesn't work:** API calls, simulation, authentication

---

### Scenario 3: Test Against Dev Azure

**Goal:** Test with dev backend without deploying

**.env file:** `.env.production` (already configured)

**Content:**
```bash
REACT_APP_DATA_CONNECTOR_API_URL=https://dev-quodsi-func-v1.azurewebsites.net/api/
```

**Build:** `npm run build` (creates production bundle)

**Manifest needed:** `manifest_dev.json` (callbackBaseUrl: https://dev-quodsi-func-v1.azurewebsites.net)

**Note:** Don't run Terminal 2 (local Azure Function) - using cloud instead

---

### Scenario 4: Test Different Backend Temporarily

**Goal:** Point to staging backend without changing committed files

**.env file:** `.env.local` (create)

**Content:**
```bash
REACT_APP_DATA_CONNECTOR_API_URL=https://staging-quodsi-func.azurewebsites.net/api/
```

**Benefit:** Overrides all other .env files, not committed to git

**Revert:** Delete `.env.local`

---

## Debugging Environment Variables

### Check What's Loaded

**In browser console:**
```javascript
// Won't work - React doesn't expose all env vars to window
console.log(process.env);

// Instead, check specific variables in your code:
// Add to a component:
console.log("API URL:", process.env.REACT_APP_DATA_CONNECTOR_API_URL);
```

**During build:**
```bash
npm run build

# Check output for warnings about undefined env vars
# Check built bundle: quodsim-react/build/static/js/main.[hash].js
```

---

### Common Issues

**Issue:** Variable not loading

**Causes:**
1. Doesn't start with `REACT_APP_`
2. Typo in variable name
3. Forgot to restart dev server after changing .env
4. Using runtime instead of build-time access

**Fix:**
```bash
# Stop React dev server (Ctrl+C in Terminal 3)
# Verify .env file has correct syntax:
cat .env.local

# Restart
npx react-scripts start
```

---

**Issue:** Using wrong API URL

**Debug:**
1. Check which .env files exist: `ls -la quodsim-react/.env*`
2. Check precedence: `.env.local` overrides `.env.production`
3. Check manifest file matches (see [02. Manifest Configuration](./02_manifest_configuration.md))
4. Check browser console for actual URL in network tab

**Fix:** Create `.env.local` with correct override

---

**Issue:** Build works locally but wrong URL in deployed

**Cause:** Different .env files used during build

**Fix:** Ensure build script uses correct NODE_ENV:
```bash
# Production build
NODE_ENV=production npm run build

# Dev build (rarely needed)
NODE_ENV=development npm run build
```

---

## Best Practices

### DO

✅ Use `.env.local` for temporary testing
✅ Start variable names with `REACT_APP_`
✅ Document variables in this file
✅ Commit `.env`, `.env.development`, `.env.production` (no secrets)
✅ Restart dev server after changing .env files
✅ Check browser network tab to verify API URLs

### DON'T

❌ Put secrets in committed .env files
❌ Use non-`REACT_APP_` prefixed variables (won't work)
❌ Expect .env changes to hot reload (requires restart)
❌ Rely on runtime environment variable changes
❌ Commit `.env.local` (should be in .gitignore)

---

## Related Documentation

- [02. Manifest Configuration](./02_manifest_configuration.md) - Extension manifest must match
- [03. MSAL Authentication](./03_msal_authentication.md) - Redirect URIs affected by environment
- [04. Azure Function Environment](./04_azure_function_environment.md) - Backend configuration
- [05. Common Gotchas](./05_common_gotchas.md) - Mismatched environment issues

---

## Quick Reference

| Variable | Current Value | File | Impact |
|----------|---------------|------|--------|
| REACT_APP_DATA_CONNECTOR_API_URL | dev Azure URL | .env.production | API calls |
| REACT_APP_AZURE_STATUS_FUNCTION_KEY | dev key | .env.production | Status polling |
| REACT_APP_API_BASE_URL | Default in code | - | Legacy API |
| REACT_APP_QUODSI_FASTAPI_URL | Default in code | - | Alternative backend |
| NODE_ENV | Auto-set | - | Logging, dev tools |
| DISABLE_ESLINT_PLUGIN | true | .env | Build speed |

**Most important for returning to project:** REACT_APP_DATA_CONNECTOR_API_URL must match manifest's callbackBaseUrl environment!
