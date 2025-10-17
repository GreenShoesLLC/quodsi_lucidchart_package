# Environment Configuration

Complete reference for environment variables, manifests, and configuration that impacts the Quodsi extension and React app.

**Use this when:** Returning to the project after weeks/months away and need to remember environment setup.

---

## Quick Reference

### Environments

| Environment | React .env | Manifest | Data Connector URL | Purpose |
|-------------|------------|----------|-------------------|---------|
| **Local** | `.env.local` (empty) | `manifest_local.json` | `http://localhost:7071` | Full local development |
| **Development** | `.env.development` (empty) | Not used | N/A | React-only development |
| **Dev (Azure)** | `.env.production` | `manifest_dev.json` | `https://dev-quodsi-func-v1.azurewebsites.net` | Testing against dev Azure |
| **Test (Azure)** | `.env.production` | `manifest_test.json` | `https://tst-quodsi-func-v1.azurewebsites.net` | Pre-production testing |

---

## Documentation Structure

### [01. React Environment Variables](./01_react_environment.md)

**What it covers:**
- All `REACT_APP_*` environment variables
- `.env` file precedence rules
- Impact on data connector API calls
- NODE_ENV effects (logging, dev tools)

**When to read:**
- Switching between local/dev/test environments
- React app not connecting to correct backend
- Authentication redirects to wrong URL

---

### [02. Manifest Configuration](./02_manifest_configuration.md)

**What it covers:**
- manifest_local.json vs manifest_dev.json vs manifest_test.json
- `callbackBaseUrl` configuration per environment
- How Lucid SDK uses the manifest
- Which manifest gets loaded when

**When to read:**
- Extension calling wrong data connector URL
- After switching git branches
- Deploying to different environments

---

### [03. MSAL Authentication](./03_msal_authentication.md)

**What it covers:**
- Tenant configuration (hard-coded in `authPolicies.ts`)
- Redirect URI logic per environment
- Cache location settings
- B2C policies (sign-in, password reset, profile edit)

**When to read:**
- Authentication redirect errors
- Cached login state issues
- MSAL errors in console
- Running in iframe vs standalone

---

### [04. Azure Function Environment](./04_azure_function_environment.md)

**What it covers:**
- `local.settings.json` variables (reference only)
- Storage and Batch configuration
- CORS settings
- Why this matters for extension development

**When to read:**
- Simulation submission fails
- CORS errors from data connector
- Understanding full environment setup

---

### [05. Common Gotchas](./05_common_gotchas.md)

**What it covers:**
- Manifest/React .env mismatch symptoms
- Wrong redirect URI after returning to project
- CORS errors and how to fix
- Port conflicts
- Cached authentication state
- Missing configuration files

**When to read:**
- First time back after months away
- Things that "used to work" are broken
- Unexplained connection failures

---

## Most Common Issues When Returning

### Issue: "Data connector calls failing"

**Quick check:**
1. Which manifest are you using? → `manifest_local.json` for local dev
2. Is Azure Function running? → Terminal 2 should show port 7071
3. React .env file? → Should be `.env.local` (empty) for local dev

**Fix:** See [02. Manifest Configuration](./02_manifest_configuration.md) and [01. React Environment](./01_react_environment.md)

---

### Issue: "Authentication redirect errors"

**Quick check:**
1. What URL is redirect attempting? → Check browser console for MSAL logs
2. Running in iframe? → Extension at localhost:9900
3. React standalone? → http://localhost:3000

**Fix:** See [03. MSAL Authentication](./03_msal_authentication.md)

---

### Issue: "Extension loads but React panel blank"

**Quick check:**
1. Is React dev server running? → Terminal 3, port 3000
2. Browser console errors? → F12, look for CORS or 404
3. CORS configured? → Check Azure Function local.settings.json

**Fix:** See [04. Azure Function Environment](./04_azure_function_environment.md)

---

## Environment Configuration Matrix

### Local Development (Full Stack)

```
Terminal 1: npm run build -w @quodsi/shared
Terminal 2: Azure Function → localhost:7071
Terminal 3: React → localhost:3000
Terminal 4: Extension → localhost:9900

Manifest: manifest_local.json
React .env: .env.local (empty/minimal)
Data Connector: localhost:7071
MSAL Redirect: http://localhost:9900/resources/quodsim-react/index.html
```

**Used for:** Daily development, full feature testing, debugging

---

### React-Only Development

```
Terminal 3: React → localhost:3000 (standalone)

Manifest: Not loaded
React .env: .env.development (empty)
Data Connector: N/A
MSAL Redirect: http://localhost:3000/
```

**Used for:** UI work, component development, no backend needed

---

### Testing Against Dev Azure

```
Terminal 4: Extension → localhost:9900

Manifest: manifest_dev.json
React .env: .env.production
Data Connector: https://dev-quodsi-func-v1.azurewebsites.net
MSAL Redirect: http://localhost:9900/resources/quodsim-react/index.html
```

**Used for:** Testing with dev backend, integration testing

---

## File Locations

### React Environment Files
```
editorextensions/quodsi_editor_extension/quodsim-react/
├── .env                    # Base config (DISABLE_ESLINT_PLUGIN=true)
├── .env.local              # Local overrides (gitignored)
├── .env.development        # Dev mode (empty currently)
├── .env.test               # Test mode (empty currently)
└── .env.production         # Production (has REACT_APP_DATA_CONNECTOR_API_URL)
```

### Manifest Files (Root)
```
/
├── manifest_local.json     # Local development
├── manifest_dev.json       # Dev environment
├── manifest_test.json      # Test environment
└── manifest.json           # Production (generated during build)
```

### MSAL Configuration (Hard-coded)
```
editorextensions/quodsi_editor_extension/quodsim-react/src/config/
├── authPolicies.ts         # Tenant, client ID, B2C policies
└── msalConfig.ts          # Redirect URI logic, cache settings
```

### Azure Function Configuration
```
dataconnectors/quodsi_data_connector_lucidchart_v2/
├── local.settings.json.template  # Template with placeholder values
└── local.settings.json           # Your local config (gitignored)
```

---

## Variable Naming Conventions

### React Environment Variables

**Must start with `REACT_APP_`** - This is Create React App convention
- `REACT_APP_DATA_CONNECTOR_API_URL` - Azure Function URL
- `REACT_APP_AZURE_STATUS_FUNCTION_KEY` - Function key for status endpoint
- `REACT_APP_API_BASE_URL` - Quodsi API base URL
- `REACT_APP_QUODSI_FASTAPI_URL` - FastAPI backend URL

**System variables:**
- `NODE_ENV` - Set by npm scripts (development/production/test)
- `DISABLE_ESLINT_PLUGIN` - Disable ESLint during build

---

## Precedence Rules

### React .env File Loading

**Order of precedence (highest to lowest):**
1. `.env.local` - Local overrides (never committed)
2. `.env.development`, `.env.test`, `.env.production` - Environment-specific
3. `.env` - Base configuration

**Example:** If both `.env.local` and `.env.production` define `REACT_APP_DATA_CONNECTOR_API_URL`:
- `.env.local` value wins
- `.env.production` value ignored

---

## Security Notes

### Never Commit These Files

- `local.settings.json` - Contains Azure credentials
- `.env.local` - Contains local overrides and secrets

**Why?** They contain:
- Azure storage connection strings
- Batch account keys
- Function keys
- API secrets

### Safe to Commit

- `.env` - Base configuration only
- `.env.development`, `.env.test`, `.env.production` - Environment-specific (should not contain secrets)
- `local.settings.json.template` - Template with placeholder values

---

## Switching Environments

### From Local to Dev Azure

1. **Change manifest:**
   ```bash
   # Use manifest_dev.json instead of manifest_local.json
   # (This happens automatically when you publish to dev)
   ```

2. **React .env stays same:**
   - `.env.production` already has dev Azure URL

3. **Restart Terminal 4:**
   ```bash
   npx lucid-package@latest test-editor-extension quodsi_editor_extension
   ```

---

### From Dev Azure to Local

1. **Change manifest:**
   - Use `manifest_local.json`

2. **Start local Azure Function:**
   ```bash
   cd dataconnectors/quodsi_data_connector_lucidchart_v2
   func start --debug --verbose
   ```

3. **Restart Terminal 4:**
   ```bash
   npx lucid-package@latest test-editor-extension quodsi_editor_extension
   ```

---

## Related Documentation

- [Development Startup](../../../../_docs/development/README.md) - How to start all services
- [Troubleshooting](../../../../_docs/development/04_troubleshooting.md) - Common startup issues
- [Messaging Architecture](../messaging/README.md) - How extension and React communicate
- [Bootstrap Sequence](../bootstrap/README.md) - Initialization flow

---

## Quick Checklist: "I Just Came Back to This Project"

**Before you start coding:**

- [ ] Read [05. Common Gotchas](./05_common_gotchas.md)
- [ ] Verify which manifest you're using (local vs dev vs test)
- [ ] Check `.env.local` exists (even if empty)
- [ ] Review MSAL redirect URI logic in [03. MSAL Authentication](./03_msal_authentication.md)
- [ ] Verify `local.settings.json` exists (for local Azure Function)
- [ ] Check ports 3000, 7071, 9900, 9901 are available

**If things don't work:**

1. Check [05. Common Gotchas](./05_common_gotchas.md) first
2. Verify environment configuration matches your intent (local vs Azure)
3. Clear browser cache and sessionStorage
4. Restart all terminals
5. Check browser console for specific errors

---

**Ready to dive in?** Start with [05. Common Gotchas](./05_common_gotchas.md) for the issues you'll likely hit first!
