# 01. Prerequisites

Complete setup requirements before starting local development.

## Required Software

### Node.js (Version 18 or Higher)

The project requires Node.js 18 or higher with npm.

**Download:** https://nodejs.org/

**Verify installation:**
```bash
node --version
npm --version
```

**Expected output:**
- Node: `v18.x.x` or higher
- npm: `9.x.x` or higher

---

### Azure Functions Core Tools (Version 4)

Required for running the data connector locally.

**Download:** https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local

**Installation:**

**Windows:**
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

**Mac (Homebrew):**
```bash
brew tap azure/functions
brew install azure-functions-core-tools@4
```

**Linux:**
```bash
wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4
```

**Verify installation:**
```bash
func --version
```

**Expected output:** `4.x.xxxx`

---

### Visual Studio Code

**Download:** https://code.visualstudio.com/

**Recommended Extensions:**
- **Azure Functions** (`ms-azuretools.vscode-azurefunctions`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **TypeScript and JavaScript Language Features** (built-in)
- **React Developer Tools** (browser extension)

**Install extensions:**
```bash
# From VS Code terminal
code --install-extension ms-azuretools.vscode-azurefunctions
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

---

## Repository Setup

### Clone Repository

```bash
git clone <repository-url>
cd quodsi_lucidchart_package
```

### Install Dependencies

From the repository root:
```bash
npm install
```

This installs dependencies for all workspaces (shared, extension, React app, data connector).

---

## Configuration Files

### Azure Function Configuration

**Location:** `dataconnectors/quodsi_data_connector_lucidchart_v2/`

**Template:** `local.settings.json.template`

**Setup:**

1. Copy template to `local.settings.json`:
   ```bash
   cd dataconnectors/quodsi_data_connector_lucidchart_v2
   cp local.settings.json.template local.settings.json
   ```

2. Edit `local.settings.json` and fill in values:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "<from Azure Portal>",
    "BATCH_ACCOUNT_URL": "<from Azure Portal>",
    "BATCH_ACCOUNT_NAME": "<from Azure Portal>",
    "BATCH_ACCOUNT_KEY": "<from Azure Portal>",
    "BATCH_POOL_ID": "dev-quodsi-pool",
    "DEFAULT_APPLICATION_ID": "dev_quodsim",
    "DEFAULT_APP_VERSION": "1.0"
  }
}
```

**Where to get Azure values:**
- Azure Portal → Storage Account → Access Keys → Connection String
- Azure Portal → Batch Account → Keys

**For development without Azure:**
- The function will start but simulation submission will fail
- You can still test the extension, React app, and model building
- Simulation requires Azure resources

**Security:**
- `local.settings.json` is in `.gitignore` - never commit it
- Contains sensitive credentials

---

## Optional: Azure Account

**When needed:**
- Production deployment
- Testing simulation execution
- Integration testing with Azure Batch

**Not needed for:**
- Extension development
- React UI development
- Model validation and building

**Setup:**
1. Create free Azure account: https://azure.microsoft.com/free/
2. Create Storage Account
3. Create Batch Account
4. Get credentials (see Configuration Files above)

---

## Verification Checklist

Before proceeding to startup, verify:

- [ ] Node.js 18+ installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] Azure Functions Core Tools v4 installed: `func --version`
- [ ] VS Code installed
- [ ] Repository cloned
- [ ] Dependencies installed: `npm install` completed successfully
- [ ] `local.settings.json` created (even if empty)
- [ ] VS Code extensions installed (recommended)

---

## Troubleshooting

### Issue: npm install fails with permission errors

**Solution (Mac/Linux):**
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

**Solution (Windows):**
- Run terminal as Administrator
- Or use `npm install --no-optional`

---

### Issue: func command not found

**Cause:** Azure Functions Core Tools not in PATH

**Solution (Windows):**
1. Restart terminal/VS Code after installation
2. Or add to PATH: `C:\Program Files\Microsoft\Azure Functions Core Tools`

**Solution (Mac):**
```bash
echo 'export PATH="/usr/local/opt/azure-functions-core-tools@4/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

### Issue: VS Code doesn't recognize TypeScript

**Solution:**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run: "TypeScript: Select TypeScript Version"
3. Choose "Use Workspace Version"

---

## Next Steps

Once all prerequisites are met, proceed to:
- [02. Local Startup](./02_local_startup.md) - Start all services
- [Quick Start Guide](../../GETTING_STARTED.md) - Fast-track to running state
