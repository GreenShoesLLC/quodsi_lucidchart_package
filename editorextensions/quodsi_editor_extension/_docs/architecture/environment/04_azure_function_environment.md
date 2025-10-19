# 04. Azure Function Environment (Data Connector)

Reference for Azure Function (data connector) environment variables. While this is backend configuration, it impacts extension development when running locally.

**Note:** This is reference documentation. You typically only modify these variables when:
- Setting up local development for first time
- Simulation submission isn't working
- CORS errors from data connector

---

## Overview

The data connector is an Azure Function app that:
- Receives model definitions from extension
- Uploads models to Azure Blob Storage
- Submits batch jobs for simulation
- Returns job IDs and status

**Environment configuration:** `local.settings.json` (local only, gitignored)

**Template:** `local.settings.json.template` (committed to git)

---

## Configuration File

### local.settings.json

**Location:** `dataconnectors/quodsi_data_connector_lucidchart_v2/local.settings.json`

**Status:** Must create from template (gitignored, contains secrets)

**Creation:**
```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2
cp local.settings.json.template local.settings.json
# Then edit values with real credentials
```

**Security:** Never commit this file - contains Azure credentials

---

## Environment Variables

### AzureWebJobsStorage

**Purpose:** Storage account for Azure Functions runtime

**Format:** Connection string

**Example:**
```
DefaultEndpointsProtocol=https;AccountName=devquodsilucidfunctionap;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net
```

**Used for:** Azure Functions internal state, not simulation data

**Required:** Yes (even for local development)

**Can use:** `UseDevelopmentStorage=true` for local emulator (not recommended)

---

### FUNCTIONS_WORKER_RUNTIME

**Purpose:** Specifies function app language runtime

**Value:** `node`

**Required:** Yes

**Don't change** unless switching language (not applicable)

---

### NODE_ENV

**Purpose:** Node.js environment mode

**Values:** `development` | `production`

**Current:** `development` (in template)

**Impact:**
- Logging verbosity
- Error detail level
- Stack traces

---

### QUODSI_ENVIRONMENT

**Purpose:** Application environment identifier

**Values:** `dev` | `test` | `prod`

**Current:** `dev` (in template)

**Used for:**
- Environment-specific logic
- Resource naming
- Logging tags

---

### QUODSI_STORAGE_ACCOUNT

**Purpose:** Storage account name for Quodsi data

**Value:** `devquodsist01` (dev environment)

**Used for:** Identifying which storage account to use

---

### AzureStorageConnectionString

**Purpose:** Connection string for Quodsi simulation data storage

**Format:** Connection string with account key

**Example:**
```
DefaultEndpointsProtocol=https;AccountName=devquodsist01;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net
```

**Used for:**
- Uploading model definitions
- Storing simulation input files
- Retrieving simulation results

**Required:** Yes (simulation won't work without it)

**Where to get:**
1. Azure Portal → Storage Account → Access Keys
2. Copy "Connection string"

---

### BatchAccountUrl

**Purpose:** Azure Batch service endpoint

**Format:** HTTPS URL

**Example:** `https://quodsisharedbatch01.eastus2.batch.azure.com`

**Used for:** Connecting to Batch service to submit jobs

**Required:** Yes

**Where to get:**
1. Azure Portal → Batch Account → Overview
2. Copy "Batch account URL"

---

### BatchAccountName

**Purpose:** Batch account identifier

**Value:** `quodsisharedbatch01` (shared batch account)

**Used for:** Batch API authentication

**Required:** Yes

---

### BatchAccountKey

**Purpose:** Batch account access key

**Format:** Base64-encoded key

**Used for:** Authenticating with Batch service

**Required:** Yes

**Where to get:**
1. Azure Portal → Batch Account → Keys
2. Copy "Primary access key"

**Security:** Never commit - this is a secret

---

### BatchPoolId

**Purpose:** Batch pool ID for simulation execution

**Values:**
- `quodsi-dev-python-pool-01` (dev)
- `quodsi-test-python-pool-01` (test)
- `quodsi-prod-python-pool-01` (prod)

**Used for:** Specifying which compute pool to run simulations on

**Required:** Yes

**Must exist:** Pool must be created in Azure Batch before use

---

### DefaultApplicationId

**Purpose:** Batch application package identifier

**Values:**
- `dev_quodsim` (dev)
- `test_quodsim` (test)
- `prod_quodsim` (prod)

**Used for:** Identifying which application version to run on batch nodes

**Required:** Yes

---

### DefaultAppVersion

**Purpose:** Application package version

**Value:** `1.0` (or current version)

**Used for:** Specifying which version of the simulation app to run

**Required:** Yes

---

### QUODSI_API_URL (Legacy)

**Purpose:** Legacy Quodsi API URL

**Value:** `http://localhost:5000/api/`

**Current status:** Not actively used

**Can be:** Left as default

---

### AZURE_FUNCTION_PROXY_BACKEND_URL_DECODE_SLASHES

**Purpose:** Azure Functions proxy URL decoding configuration

**Value:** `true`

**Impact:** How URL paths are processed

**Don't change** unless troubleshooting routing issues

---

## Host Configuration

### LocalHttpPort

**Purpose:** Port for local function runtime

**Value:** `7071` (default)

**Impact:** Where `func start` listens

**Must match:**
- `manifest_local.json` callbackBaseUrl
- React `REACT_APP_DATA_CONNECTOR_API_URL` (local)

**Change only if:** Port 7071 conflicts with other services

---

### CORS

**Purpose:** Cross-Origin Resource Sharing allowed origins

**Value:**
```
https://lucid.app,https://lucidchart.com,http://localhost:9900,http://localhost:9901
```

**Critical for development!** Extension runs on different origin than function

**Must include:**
- `https://lucid.app` - Production LucidChart
- `https://lucidchart.com` - Legacy domain
- `http://localhost:9900` - Extension test server
- `http://localhost:9901` - Shape libraries server

**Why needed:** Browser blocks cross-origin requests without CORS

**Symptoms if wrong:** `CORS policy blocked` errors in browser console

---

### CORSCredentials

**Purpose:** Allow credentials in CORS requests

**Value:** `true`

**Impact:** Allows cookies/auth headers in cross-origin requests

**Required:** Yes (for OAuth integration)

---

### CORSHeaders

**Purpose:** Allowed custom headers in CORS requests

**Value:** `Content-Type,Authorization,X-Lucid-Signature,X-Lucid-RSA-Nonce`

**Impact:** Which headers Lucid SDK can send

**Don't remove:** Required for Lucid data connector protocol

---

## Environment Setup Checklist

### First-Time Local Setup

1. **Create configuration file:**
   ```bash
   cd dataconnectors/quodsi_data_connector_lucidchart_v2
   cp local.settings.json.template local.settings.json
   ```

2. **Get Azure credentials:**
   - Storage connection strings (2)
   - Batch account URL
   - Batch account key

3. **Edit local.settings.json:**
   - Replace all `YOUR_*_KEY` placeholders
   - Verify BatchPoolId exists in Azure
   - Check CORS origins include localhost:9900

4. **Start function:**
   ```bash
   npm run build
   func start --debug --verbose
   ```

5. **Verify:**
   ```bash
   curl http://localhost:7071
   # Should return 200 OK or function list
   ```

---

## Common Issues

### Issue: Missing local.settings.json

**Symptoms:**
- `func start` errors about missing configuration
- Function starts but simulation fails
- "Cannot find module" errors

**Fix:**
```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2
cp local.settings.json.template local.settings.json
# Edit with real values
```

---

### Issue: CORS Errors

**Symptoms:**
- Browser console: `CORS policy blocked`
- Network tab shows failed OPTIONS request
- Extension can't reach function

**Debug:**
```bash
# Check CORS setting
cat local.settings.json | grep CORS
```

**Fix:**
```json
"Host": {
  "CORS": "https://lucid.app,https://lucidchart.com,http://localhost:9900,http://localhost:9901"
}
```

**Restart function after changing**

---

### Issue: Batch Submission Fails

**Symptoms:**
- Simulation submission returns error
- Function logs show "Batch configuration error"
- "Pool not found" errors

**Debug checklist:**
- [ ] BatchAccountUrl correct
- [ ] BatchAccountKey not expired
- [ ] BatchPoolId exists in Azure Portal
- [ ] Pool is Active (not Deleting or Offline)
- [ ] DefaultApplicationId uploaded to batch account

**Fix:** Verify each Batch* variable matches Azure Portal

---

### Issue: Storage Upload Fails

**Symptoms:**
- Simulation starts but model upload fails
- "Storage authentication failed"
- Timeout errors

**Debug:**
```bash
# Test storage connection
az storage container list --connection-string "YOUR_CONNECTION_STRING"
```

**Fix:**
- Verify AzureStorageConnectionString is correct
- Check storage account not locked/suspended
- Verify key not rotated in Azure Portal

---

### Issue: Port 7071 Already in Use

**Symptoms:**
- `func start` fails with "address already in use"

**Debug:**
```bash
# Windows
netstat -ano | findstr 7071

# Mac/Linux
lsof -i :7071
```

**Fix Option 1 - Kill process:**
```bash
# Windows
taskkill /PID <PID> /F

# Mac/Linux
kill -9 <PID>
```

**Fix Option 2 - Change port:**
```json
"Host": {
  "LocalHttpPort": 7072
}
```

**Then update:**
- `manifest_local.json` callbackBaseUrl
- React REACT_APP_DATA_CONNECTOR_API_URL

---

## Development Without Azure

**Can you develop extension without Azure credentials?**

**YES** - for UI/model building work:
- Extension loads and works
- React app functions
- Model validation works
- Element editing works

**NO** - for simulation features:
- Simulation submission will fail
- Can't upload models
- Can't run batch jobs
- Status polling returns errors

**Workaround:** Use manifest_dev.json to point to dev Azure instead of local

---

## Azure Resources Reference

### Dev Environment

| Resource | Name | Purpose |
|----------|------|---------|
| Function App | dev-quodsi-func-v1 | Data connector |
| Storage (function) | devquodsilucidfunctionap | Function runtime |
| Storage (data) | devquodsist01 | Simulation data |
| Batch Account | quodsisharedbatch01 | Compute pool |
| Batch Pool | quodsi-dev-python-pool-01 | Simulation execution |

### Test Environment

| Resource | Name | Purpose |
|----------|------|---------|
| Function App | tst-quodsi-func-v1 | Data connector |
| Storage (data) | tstquodsist01 | Simulation data |
| Batch Pool | quodsi-test-python-pool-01 | Simulation execution |

### Production Environment

| Resource | Name | Purpose |
|----------|------|---------|
| Function App | prd-quodsi-func-v1 | Data connector |
| Storage (data) | prdquodsist01 | Simulation data |
| Batch Pool | quodsi-prod-python-pool-01 | Simulation execution |

---

## Security Best Practices

### DO

✅ Keep `local.settings.json` in .gitignore
✅ Use separate credentials for each environment
✅ Rotate keys periodically
✅ Use managed identities in Azure (production)
✅ Limit CORS origins to necessary domains

### DON'T

❌ Commit `local.settings.json`
❌ Share credentials in chat/email
❌ Use production keys in local development
❌ Allow `*` in CORS (security risk)
❌ Hardcode credentials in source code

---

## Deployment Configuration

**Important:** Deployed Azure Functions use Application Settings (not local.settings.json)

**Where to set:**
1. Azure Portal
2. Function App
3. Configuration → Application settings

**Same variables** as local.settings.json, but managed in Azure

**CI/CD:** Deployment scripts should set these automatically

---

## Monitoring and Debugging

### View Function Logs

**Local:**
- Terminal 2 shows logs in real-time
- Use `--verbose` flag for detailed output

**Azure:**
```bash
# Azure CLI
az webapp log tail --name dev-quodsi-func-v1 --resource-group quodsi-dev-rg
```

**Azure Portal:**
- Function App → Log stream

---

### Test Endpoints

**Local function health check:**
```bash
curl http://localhost:7071

# Or specific action:
curl -X POST http://localhost:7071/api/dataConnector/saveAndSubmitSimulationAction \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Related Documentation

- [01. React Environment](./01_react_environment.md) - Frontend config must match backend
- [02. Manifest Configuration](./02_manifest_configuration.md) - Manifest callbackBaseUrl points here
- [05. Common Gotchas](./05_common_gotchas.md) - Mismatched configuration issues

---

## Quick Reference

| Variable | Purpose | Required | Impact if Wrong |
|----------|---------|----------|-----------------|
| AzureWebJobsStorage | Function runtime | Yes | Function won't start |
| AzureStorageConnectionString | Model storage | Yes | Upload fails |
| BatchAccountUrl | Batch endpoint | Yes | Simulation fails |
| BatchAccountKey | Batch auth | Yes | Submission fails |
| BatchPoolId | Compute pool | Yes | Job creation fails |
| LocalHttpPort | Local port | Yes | Extension can't reach |
| CORS | Allowed origins | Yes | Browser blocks requests |

**Most common issue when returning:** Missing or stale `local.settings.json`. Copy from template and update credentials.
