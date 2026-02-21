# 04. Troubleshooting

Common startup problems and quick solutions for local development.

## Quick Diagnostic Steps

When something isn't working:

1. ☐ Check all 4 terminals are running without errors
2. ☐ Verify ports 3000 and 7071 are not in use by other apps
3. ☐ Check shared library built successfully (`shared/dist/` exists)
4. ☐ Look for error messages in terminal output
5. ☐ Check browser console (F12) for errors

---

## Common Startup Issues

### Issue: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```
or
```
Port 7071 is already in use
```

**Solution - Find and Kill Process:**

**Windows:**
```bash
netstat -ano | findstr "3000"
taskkill /PID <PID> /F

netstat -ano | findstr "7071"
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:7071 | xargs kill -9
```

**Alternative - Use Different Port:**

For React (Terminal 3):
```bash
PORT=3001 npx react-scripts start
```

For Function (Terminal 2):
```bash
func start --port 7072 --debug --verbose
```

**Note:** If you change ports, update extension configuration to match new React URL.

---

### Issue: Cannot Find Module '@quodsi/shared'

**Symptoms:**
```
Error: Cannot find module '@quodsi/shared'
Module not found: Can't resolve '@quodsi/shared'
```

**Cause:** Shared library not built or out of date

**Solution:**

```bash
cd /mnt/c/_source/quodsi/quodsi_lucidchart_package
npm run build -w @quodsi/shared
```

**Then restart affected services:**
- Terminal 2 (Azure Function): Ctrl+C, then restart
- Terminal 4 (Extension): Ctrl+C, then restart

**Verify Fix:**
```bash
ls shared/dist/
```

Should show compiled JavaScript files and `.d.ts` type declarations.

---

### Issue: npm install Fails

**Symptoms:**
```
npm ERR! code EACCES
npm ERR! permission denied
```

**Solution - Mac/Linux:**
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
npm install
```

**Solution - Windows:**
- Run terminal as Administrator
- Or try:
```bash
npm install --no-optional
```

**Alternative - Clear Cache:**
```bash
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

---

### Issue: Azure Function Fails to Start

**Symptoms:**
```
Value cannot be null. (Parameter 'provider')
Cannot find Azure Functions runtime
```

**Cause:** Azure Functions Core Tools not installed or wrong version

**Verify Installation:**
```bash
func --version
```

**Expected:** `4.x.xxxx`

**Install/Reinstall:**

**Windows:**
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

**Mac:**
```bash
brew tap azure/functions
brew install azure-functions-core-tools@4
```

**Restart terminal after installation.**

---

### Issue: Function Starts But Can't Submit Simulation

**Symptoms:**
- Function terminal shows no errors
- Simulation submission fails with configuration error
- Logs show: "Missing Azure configuration"

**Cause:** `local.settings.json` missing or incomplete

**Solution:**

```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2
cp local.settings.json.template local.settings.json
```

**Edit `local.settings.json` and add Azure credentials:**
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
    "BATCH_POOL_ID": "dev-quodsi-pool"
  }
}
```

**Restart Terminal 2** after editing.

**Note:** For local UI/extension development without Azure, you can use placeholder values - simulation won't work but everything else will.

---

### Issue: React Compilation Errors

**Symptoms:**
```
Module not found: Can't resolve './Component'
Failed to compile
TypeScript error in ...
```

**Solution - Clear Build Cache:**

```bash
cd editorextensions/quodsi_editor_extension/quodsim-react
rm -rf node_modules
rm -rf build
rm package-lock.json
npm install
npx react-scripts start
```

**Solution - TypeScript Errors:**
```bash
npm run build -w @quodsi/shared
```

Then restart Terminal 3.

---

### Issue: Extension Not Loading in Browser

**Symptoms:**
- Browser opens but extension panel not visible
- "Quodsi" not in left sidebar
- Console error: "Extension failed to load"

**Solutions:**

**1. Hard Refresh Browser:**
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**2. Clear Browser Cache:**
- F12 → Application → Clear Storage → Clear site data
- Refresh page

**3. Restart Extension Test (Terminal 4):**
- Ctrl+C in Terminal 4
- Run again:
```bash
npx lucid-package@latest test-editor-extension quodsi_editor_extension
```

**4. Check React Server Running:**
- Verify Terminal 3 shows "Compiled successfully!"
- Test: `curl http://localhost:3000`

**5. Check Browser Console:**
- F12 → Console
- Look for specific error messages
- Common: CORS errors, 404 for React assets

---

### Issue: Hot Reload Not Working

**Symptoms:**
- Modify React file but changes don't appear
- Have to manually refresh browser each time

**Solution - Restart React Dev Server:**

```bash
# In Terminal 3
# Ctrl+C to stop
cd editorextensions/quodsi_editor_extension/quodsim-react
npx react-scripts start
```

**Solution - WebSocket Connection:**

Check browser console for WebSocket errors. If present:
```bash
# Stop React server (Ctrl+C)
# Clear port
lsof -ti:3000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr "3000" && taskkill /PID <PID> /F  # Windows

# Restart
npx react-scripts start
```

---

### Issue: Extension Changes Not Reflected

**Symptoms:**
- Modified extension TypeScript files
- Changes don't appear in test environment

**Cause:** Extension requires rebuild, not hot reload

**Solution:**

```bash
# Stop Terminal 4 (Ctrl+C)
# Restart extension test
npx lucid-package@latest test-editor-extension quodsi_editor_extension
```

**Note:** React changes (Terminal 3) hot reload automatically. Extension changes (Terminal 4) require restart.

---

### Issue: "Workspace not found" Error

**Symptoms:**
```
npm ERR! No workspaces found
npm ERR! Workspace '@quodsi/shared' not found
```

**Cause:** Not in repository root or workspace configuration issue

**Solution:**

```bash
# Ensure you're in repository root
cd /mnt/c/_source/quodsi/quodsi_lucidchart_package
pwd  # Should show repository root

# Verify package.json has workspaces
cat package.json | grep -A 5 workspaces

# Reinstall
npm install
```

---

### Issue: Multiple Node Processes Running

**Symptoms:**
- Port conflicts even after stopping terminals
- "Already in use" errors persist

**Solution - Kill All Node Processes:**

**Windows:**
```bash
tasklist | findstr node
taskkill /IM node.exe /F
```

**Mac/Linux:**
```bash
ps aux | grep node
killall node
```

**Then restart services from scratch** (Terminal 1-4).

**Warning:** This kills ALL Node processes on your machine.

---

### Issue: Browser Opens to Wrong Document

**Symptoms:**
- Terminal 4 opens browser but shows wrong LucidChart document
- Extension test opens to folder view instead of document

**Solution:**

Once browser opens:
1. Create new document: "+ New" → "Blank Document"
2. Or open existing test document from "Documents"
3. Open Quodsi panel: Left sidebar → "..." (More Tools) → "Quodsi"

**Note:** Extension only works within a document, not in folder/home view.

---

## Complete Restart Procedure

When all else fails, clean restart:

**1. Stop All Services:**
- Ctrl+C in all 4 terminals
- Close browser tabs

**2. Kill Processes:**

**Windows:**
```bash
taskkill /IM node.exe /F
netstat -ano | findstr "3000 7071"
```

**Mac/Linux:**
```bash
killall node
lsof -ti:3000 | xargs kill -9
lsof -ti:7071 | xargs kill -9
```

**3. Clean Build:**

```bash
cd /mnt/c/_source/quodsi/quodsi_lucidchart_package
rm -rf shared/dist
rm -rf dataconnectors/quodsi_data_connector_lucidchart_v2/dist
rm -rf editorextensions/quodsi_editor_extension/quodsim-react/build
```

**4. Fresh Install:**

```bash
npm install
npm run build -w @quodsi/shared
```

**5. Restart All Terminals:**

Follow [02. Local Startup](./02_local_startup.md) in order.

---

## Verification Commands

### Check Services Running

**Ports:**
```bash
# Windows
netstat -ano | findstr "3000 7071"

# Mac/Linux
lsof -i :3000
lsof -i :7071
```

**Endpoints:**
```bash
# React dev server
curl http://localhost:3000

# Azure Function
curl http://localhost:7071
```

### Check Build Output

```bash
# Shared library
ls shared/dist/

# Function
ls dataconnectors/quodsi_data_connector_lucidchart_v2/dist/

# React (production build)
ls editorextensions/quodsi_editor_extension/quodsim-react/build/
```

### Check Node Version

```bash
node --version  # Should be v18+
npm --version   # Should be v9+
func --version  # Should be 4.x
```

---

## Debug Mode

### Enable Verbose Logging

**Azure Function:**
```bash
func start --debug --verbose
```

**React (already verbose):**
```bash
VERBOSE=true npx react-scripts start
```

**Browser Console:**
- F12 → Console
- Enable "Verbose" level
- Filter by "[Quodsi]" or component name

---

## Getting Help

### Before Asking

1. ✓ Try solutions in this guide
2. ✓ Check all 4 terminals for error messages
3. ✓ Check browser console (F12)
4. ✓ Verify Node/npm/func versions
5. ✓ Try complete restart procedure

### Information to Provide

**For Bug Reports:**
- Operating system (Windows/Mac/Linux)
- Node version: `node --version`
- Error messages (full stack trace)
- Which terminal failed (1, 2, 3, or 4)
- Steps to reproduce

**For Build Failures:**
- Terminal output
- Contents of `package.json` workspace section
- Result of `ls shared/dist/`
- Whether `npm install` completed successfully

---

## Platform-Specific Notes

### Windows (WSL)

If using WSL (Windows Subsystem for Linux):

**Path Format:**
```bash
cd /mnt/c/_source/quodsi/quodsi_lucidchart_package
```

**Port Access:**
- Ports accessible from Windows browser at `localhost`
- No special configuration needed for WSL2

**File Permissions:**
- Some npm operations may require `sudo`
- Or adjust ownership: `sudo chown -R $USER:$USER .`

---

### Mac (M1/M2)

**Architecture Issues:**

Some npm packages may need Rosetta:
```bash
arch -x86_64 npm install
```

**Homebrew Path:**
```bash
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

### Linux

**Azure Functions Core Tools:**

Follow platform-specific installation:
```bash
wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4
```

---

## Related Documentation

- [01. Prerequisites](./01_prerequisites.md) - Required software and setup
- [02. Local Startup](./02_local_startup.md) - Normal startup procedure
- [03. Environment Reference](./03_environment_reference.md) - URLs, ports, configs
- [Quick Start](../../GETTING_STARTED.md) - Fast-track guide
