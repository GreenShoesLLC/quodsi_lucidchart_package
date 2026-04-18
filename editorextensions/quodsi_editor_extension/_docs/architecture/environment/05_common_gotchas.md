# 05. Common Environment Gotchas

The issues you'll actually hit when returning to this project after weeks or months. **Start here** when something "used to work" but doesn't anymore.

---

## The "I Just Came Back" Quick Fixes

### First: Clear Everything

**Before debugging, try this nuclear option:**

1. **Clear browser storage:**
   ```javascript
   // Browser console (F12)
   sessionStorage.clear();
   localStorage.clear();
   ```

   Or: Browser → Settings → Clear browsing data → Cookies and site data

2. **Restart all terminals:**
   - Ctrl+C in all 4 terminals
   - Restart from Terminal 1 → 2 → 3 → 4

3. **Hard refresh browser:**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

**Fixes:** 90% of "came back after months" issues

---

## Gotcha #1: Manifest/Backend Mismatch

### Symptoms

- Extension loads but simulation fails
- Network tab shows requests to wrong URL
- Sometimes localhost, sometimes Azure
- CORS errors in console

### What Happened

You're using `manifest_dev.json` but Azure Function not running. Or using `manifest_local.json` but Terminal 2 not started.

### The Confusion

```
Your manifest says:     callbackBaseUrl: http://localhost:7071
But you think:          I want to test against dev Azure
Reality:                Extension is calling localhost (nothing there)
```

### Fix

**For local development:**
```bash
# 1. Copy local manifest
cp manifest_local.json manifest.json

# 2. Start Azure Function (Terminal 2)
cd dataconnectors/quodsi_data_connector_lucidchart_v2
npm run build
func start --debug --verbose

# 3. Verify running
curl http://localhost:7071

# 4. Restart extension (Terminal 4)
```

**For dev Azure:**
```bash
# 1. Copy dev manifest
cp manifest_dev.json manifest.json

# 2. Stop Terminal 2 (not needed)
# Ctrl+C if running

# 3. Restart extension (Terminal 4)
```

### Prevention

Check manifest before starting:
```bash
cat manifest.json | grep callbackBaseUrl
# Should match your intent (localhost vs Azure)
```

---

## Gotcha #2: React .env Not Loaded

### Symptoms

- API calls go to wrong URL
- Network tab shows unexpected endpoints
- `undefined` in place of expected URL

### What Happened

You changed `.env` file but didn't restart React dev server. Or wrong `.env` file loaded due to precedence.

### The Confusion

```
You changed:    .env.local
React loaded:   .env.production (takes precedence in production build)
Result:         Your change ignored
```

### Fix

**For development (npm start):**
```bash
# Stop Terminal 3 (Ctrl+C)
# Restart
cd editorextensions/quodsi_editor_extension/quodsim-react
npx react-scripts start
```

**For production build:**
```bash
# Check which .env files exist
ls -la .env*

# Remember precedence:
# .env.local > .env.production > .env.development > .env
```

### Prevention

- Always restart dev server after `.env` changes
- Check precedence: `.env.local` overrides everything
- Use `.env.local` for temporary overrides

---

## Gotcha #3: Missing local.settings.json

### Symptoms

- Azure Function starts but simulation fails
- "Configuration error" in function logs
- Batch submission fails

### What Happened

You pulled code from git but `local.settings.json` is gitignored. It doesn't exist locally.

### The Confusion

```
You think:    Everything in git is everything I need
Reality:      local.settings.json is gitignored (has secrets)
Result:       Missing Azure credentials
```

### Fix

```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2

# Check if exists
ls local.settings.json
# If "No such file": Create it

# Copy template
cp local.settings.json.template local.settings.json

# Edit with real credentials
# (Or ask team member for credentials)
```

### Prevention

- Document that `local.settings.json` must be created
- Keep backup somewhere secure (not git)
- Add to onboarding checklist

---

## Gotcha #4: Port Conflicts

### Symptoms

- "Address already in use" errors
- Services won't start
- `EADDRINUSE: address already in use :::3000`

### What Happened

Previous session didn't fully stop. Node processes still running on ports 3000, 7071, 9900, or 9901.

### The Confusion

```
You hit:    Ctrl+C in terminal
You think:  Process stopped
Reality:    Sometimes processes survive
Result:     Port still occupied
```

### Fix

**Windows:**
```bash
# Find processes
netstat -ano | findstr "3000 7071 9900 9901"

# Kill specific PID
taskkill /PID <PID> /F

# Nuclear option - kill all Node
taskkill /IM node.exe /F
```

**Mac/Linux:**
```bash
# Find and kill specific port
lsof -ti:3000 | xargs kill -9
lsof -ti:7071 | xargs kill -9
lsof -ti:9900 | xargs kill -9
lsof -ti:9901 | xargs kill -9

# Nuclear option - kill all Node
killall node
```

### Prevention

- Properly stop services with Ctrl+C
- If that fails, use kill commands above
- Restart machine if you keep hitting this

---

## Gotcha #5: Shared Library Out of Sync

### Symptoms

- "Cannot find module '@quodsi/shared'"
- Type errors in extension or React
- Functions/types exist in code but imports fail

### What Happened

You pulled changes that modified `shared/` but didn't rebuild it. Extension and React still using old version.

### The Confusion

```
You pulled:   Latest shared/ code
You think:    Everything updated
Reality:      shared/dist/ still has old compiled code
Result:       Using old types/functions
```

### Fix

```bash
# Terminal 1
npm run build -w @quodsi/shared

# Then restart dependent services:
# - Terminal 2 (Azure Function): Ctrl+C, rebuild, restart
# - Terminal 4 (Extension): Ctrl+C, restart
# Terminal 3 (React) auto-reloads
```

### Prevention

- Always rebuild shared library after `git pull`
- Add to startup checklist
- Consider git hook to remind you

---

## Gotcha #6: Extension Changes Not Reflected

### Symptoms

- Modified extension code but changes don't appear
- Webpack says "compiled successfully" but behavior unchanged
- Old bugs still present

### What Happened

Extension code doesn't hot reload. You must restart Terminal 4 and hard refresh browser.

### The Confusion

```
You're used to:   React hot reload (automatic)
Extension reality: Manual restart required
Result:           Still running old code
```

### Fix

```bash
# 1. Stop extension (Terminal 4)
Ctrl+C

# 2. Restart
npx lucid-package@latest test-editor-extension quodsi_editor_extension

# 3. Wait for "webpack compiled successfully"

# 4. Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### Prevention

- Remember: React hot reloads, extension doesn't
- Always restart Terminal 4 after extension code changes
- Hard refresh browser after restart

---

## Gotcha #7: Browser DevTools Closed

### Symptoms

- Can't see errors
- Don't know what's failing
- Simulation seems to hang

### What Happened

You forgot to open browser DevTools. All errors are hidden.

### The Fix

**Open DevTools:**
- F12 (Windows/Linux)
- Cmd+Option+I (Mac)

**Check tabs:**
- **Console:** Errors, warnings, logs
- **Network:** Failed requests, CORS errors, 404s
- **Application:** sessionStorage, localStorage, cookies

### Prevention

- Open DevTools first thing
- Keep Console tab visible
- Check Network tab for failed requests

---

## Gotcha #8: Testing in Production (lucid.app) Without Deploying

### Symptoms

- Opened lucid.app but extension not there
- Or: Old version of extension appears

### What Happened

Testing in production lucid.app requires deploying extension. Can't use local files.

### The Confusion

```
You think:  lucid.app should load my local code
Reality:    lucid.app loads deployed extension only
Result:     Either not found or old version
```

### Fix

**For testing latest code:**
- Use Terminal 4 test mode (localhost)
- Let lucid-package tool handle the serving
- Don't navigate to production lucid.app manually

**For production testing:**
- Deploy extension to Lucid (separate process)
- Then test in production lucid.app

### Prevention

- Understand the difference:
  - **Terminal 4:** Test mode with local code
  - **lucid.app:** Production with deployed code
- Document deployment process separately

---

## Gotcha #9: CORS Errors After Switching Environments

### Symptoms

- Console: "CORS policy blocked"
- OPTIONS request fails
- Extension can't reach Azure Function

### What Happened

Azure Function CORS settings don't include your current origin. Or you changed ports and forgot to update CORS.

### The Confusion

```
You switched to:  localhost:9901 (changed port)
CORS allows:      localhost:9900 only
Result:           Blocked
```

### Fix

**Edit local.settings.json:**
```json
"Host": {
  "CORS": "https://lucid.app,https://lucidchart.com,http://localhost:9900,http://localhost:9901"
}
```

**Restart Azure Function:**
```bash
# Terminal 2: Ctrl+C
func start --debug --verbose
```

### Prevention

- Keep standard ports (9900, 9901, 3000, 7071)
- Don't change ports without updating CORS
- Document CORS configuration

---

## Gotcha #10: Forgot Which Environment You're In

### Symptoms

- Confusion about which backend you're hitting
- Unexpected data or behavior
- Can't reproduce issues

### What Happened

Lost track of whether you're running local vs dev vs test.

### The Fix

**Check environment markers:**

```bash
# 1. Check manifest
cat manifest.json | grep callbackBaseUrl
# Shows: localhost (local) or Azure URL (dev/test)

# 2. Check Terminal 2
# If running: Local
# If not running: Azure

# 3. Check browser Network tab
# Look at actual API call URLs
```

**Document current environment:**
```bash
# Add to your notes/IDE:
# Currently testing: LOCAL (all 4 terminals)
# Or: DEV AZURE (Terminal 1, 3, 4 only)
```

### Prevention

- At session start, document which environment
- Add environment indicator to IDE/browser
- Keep notes file with current config

---

## The "Everything Is Broken" Checklist

When nothing works and you're frustrated:

### 1. Nuclear Restart

```bash
# Stop everything
# Ctrl+C in all terminals

# Kill all Node
taskkill /IM node.exe /F  # Windows
killall node              # Mac/Linux

# Clear browser
sessionStorage.clear()
localStorage.clear()

# Rebuild shared
npm run build -w @quodsi/shared

# Start fresh
# Terminal 1 → 2 → 3 → 4
```

### 2. Verify Configuration

```bash
# Check manifest
cat manifest.json | grep callbackBaseUrl

# Check .env files
ls -la editorextensions/quodsi_editor_extension/quodsim-react/.env*

# Check local.settings.json exists
ls dataconnectors/quodsi_data_connector_lucidchart_v2/local.settings.json
```

### 3. Check Services Running

```bash
# Check ports
netstat -ano | findstr "3000 7071 9900 9901"  # Windows
lsof -i :3000 && lsof -i :7071              # Mac/Linux

# Test endpoints
curl http://localhost:3000  # React
curl http://localhost:7071  # Function
```

### 4. Browser DevTools

- F12 → Console tab (check for errors)
- Network tab (check failed requests)
- Application tab (clear sessionStorage)

### 5. Read Error Messages

- Actually read the error message
- Check which file/line number
- Google the exact error text

### 6. Check Recent Changes

```bash
# What changed?
git status
git diff

# Recent commits
git log --oneline -5

# Did you pull lately?
git pull
npm run build -w @quodsi/shared
```

---

## Quick Diagnostic Commands

### Check Current Environment

```bash
# What manifest?
cat manifest.json | grep -A1 '"id"'
cat manifest.json | grep callbackBaseUrl

# What's running?
ps aux | grep node        # Mac/Linux
tasklist | findstr node   # Windows

# What ports?
netstat -ano | findstr "3000 7071 9900 9901"
```

### Check Configuration

```bash
# React env
cat editorextensions/quodsi_editor_extension/quodsim-react/.env.production

# Function config exists?
ls dataconnectors/quodsi_data_connector_lucidchart_v2/local.settings.json

# CORS configured?
cat dataconnectors/quodsi_data_connector_lucidchart_v2/local.settings.json | grep CORS
```

---

## Related Documentation

When specific issue identified:

- **Manifest wrong:** [02. Manifest Configuration](./02_manifest_configuration.md)
- **React .env issues:** [01. React Environment](./01_react_environment.md)
- **Function config:** [04. Azure Function Environment](./04_azure_function_environment.md)

For systematic setup:

- [README](./README.md) - Environment documentation hub
- [Development Startup](../../../../_docs/development/02_local_startup.md) - Correct startup sequence

---

## Prevention: Leave Notes for Future You

**Create a file:** `CURRENT_ENVIRONMENT.txt` in repository root

**Content:**
```
Last worked: 2024-03-15
Environment: LOCAL (all 4 terminals running)
Manifest: manifest_local.json
Testing: Full local stack
Notes: Working on authentication fixes

Setup:
1. cp manifest_local.json manifest.json
2. Terminal 1: npm run build -w @quodsi/shared
3. Terminal 2: func start (data connector)
4. Terminal 3: react-scripts start
5. Terminal 4: lucid-package test-editor-extension

Test account: test@example.com
```

**Future you will thank past you!**

---

## Most Common "Came Back After Months" Issues

**In order of frequency:**

1. ✅ **Wrong manifest** → Check callbackBaseUrl
2. ✅ **Forgot to restart** → Ctrl+C, restart all
3. ✅ **Missing local.settings.json** → Copy from template
4. ✅ **Port conflicts** → Kill Node processes
5. ✅ **Shared library outdated** → Rebuild shared

**Start with #1, work down the list.**

**Still stuck?** → The nuclear restart checklist above.
