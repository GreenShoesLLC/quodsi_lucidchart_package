# Development Documentation

Complete guide for setting up and running Quodsi locally. Start here for local development, debugging, and testing.

---

## Quick Start Path

**New to the project?** Follow this sequence:

1. **[Prerequisites](./01_prerequisites.md)** - Install required software (Node.js, Azure Functions Core Tools, VS Code)
2. **[Local Startup](./02_local_startup.md)** - Start all 4 services in the correct order
3. **[Environment Reference](./03_environment_reference.md)** - Understand ports, URLs, and configuration
4. **[Troubleshooting](./04_troubleshooting.md)** - Fix common issues

**Already set up?** Use [Quick Start Guide](../../GETTING_STARTED.md) at root for fast commands.

---

## Documentation Overview

### [01. Prerequisites](./01_prerequisites.md)

**What it covers:**
- Node.js 18+ installation
- Azure Functions Core Tools v4 setup
- VS Code and recommended extensions
- Repository cloning and initial `npm install`
- Creating `local.settings.json` from template

**When to use:**
- First-time setup
- New development machine
- Onboarding new developers
- Verifying software versions

**Time estimate:** 15-30 minutes

---

### [02. Local Startup](./02_local_startup.md)

**What it covers:**
- Why 4 terminals are needed
- Complete startup sequence with explanations
- Terminal 1: Build shared library
- Terminal 2: Start Azure Function (port 7071)
- Terminal 3: Start React dev server (port 3000)
- Terminal 4: Launch extension in test mode
- When to rebuild each component

**When to use:**
- Daily development startup
- After pulling code changes
- Understanding system architecture
- Learning build dependencies

**Time estimate:** 5-10 minutes to start all services

---

### [03. Environment Reference](./03_environment_reference.md)

**What it covers:**
- Local URLs and port mappings
- Configuration file locations
- Environment variables for Azure
- Build output directories
- Log locations (browser, function, React)
- Quick reference commands

**When to use:**
- Looking up port numbers
- Finding configuration files
- Checking where logs appear
- Verifying services are running
- Quick command reference

---

### [04. Troubleshooting](./04_troubleshooting.md)

**What it covers:**
- Common startup issues
- Port conflicts (3000, 7071)
- "Cannot find module '@quodsi/shared'" errors
- Build failures
- Extension not loading
- Complete restart procedure
- Platform-specific notes (Windows/Mac/Linux)

**When to use:**
- Services won't start
- Getting error messages
- Port already in use
- Hot reload not working
- After everything else fails

---

## Architecture Overview

Quodsi is a monorepo with 4 components:

```
┌─────────────────────────────────────────────────────────┐
│                    LucidChart Browser                   │
│  ┌──────────────────┐        ┌──────────────────┐     │
│  │  Extension       │◄──────►│  React Panel     │     │
│  │  (TypeScript)    │ msg    │  (port 3000)     │     │
│  └────────┬─────────┘        └──────────────────┘     │
└───────────┼──────────────────────────────────────────────┘
            │ HTTP
            ▼
   ┌────────────────────┐
   │  Azure Function    │
   │  (port 7071)       │
   └────────┬───────────┘
            │
            ▼
   ┌────────────────────┐
   │  @quodsi/shared    │
   │  (types, validation)│
   └────────────────────┘
```

**Communication:**
- Extension ↔ React: postMessage protocol
- Extension → Function: HTTP/HTTPS
- All components: Import from `@quodsi/shared`

**Why 4 terminals?**
1. **Shared Library** - Must build first (provides types to all)
2. **Azure Function** - Backend API for simulation
3. **React Dev Server** - UI with hot reload
4. **Extension Test** - Packages and loads in LucidChart

---

## Development Workflow

### Making Changes

**Shared Library** (`shared/src/`):
1. Modify TypeScript files
2. Rebuild: `npm run build -w @quodsi/shared`
3. Restart Terminal 2 (Function) and Terminal 4 (Extension)

**Extension** (`editorextensions/quodsi_editor_extension/src/`):
1. Modify TypeScript files
2. Restart Terminal 4 (Extension test)
3. Refresh browser (Ctrl+Shift+R)

**React UI** (`quodsim-react/src/`):
1. Modify React/TypeScript files
2. Hot reload automatic (1-2 seconds)
3. No restart needed

**Data Connector** (`dataconnectors/.../src/`):
1. Modify TypeScript files
2. Stop Terminal 2 (Ctrl+C)
3. Rebuild and restart: `npm run build && func start --debug --verbose`

---

## Common Commands

### Daily Startup (From Root)

**Terminal 1 - Shared Library:**
```bash
npm install
npm run build -w @quodsi/shared
```

**Terminal 2 - Azure Function:**
```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2
npm run build
func start --debug --verbose
```

**Terminal 3 - React App:**
```bash
cd editorextensions/quodsi_editor_extension/quodsim-react
npx react-scripts start
```

**Terminal 4 - Extension Test:**
```bash
npx lucid-package@latest test-editor-extension quodsi_editor_extension
```

---

### Rebuild Components

**Shared library:**
```bash
npm run build -w @quodsi/shared
```

**Azure Function:**
```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2
npm run build
```

**React (production):**
```bash
cd editorextensions/quodsi_editor_extension/quodsim-react
npm run build
```

---

### Check Services

**Verify ports:**
```bash
# Windows
netstat -ano | findstr "3000 7071"

# Mac/Linux
lsof -i :3000
lsof -i :7071
```

**Test endpoints:**
```bash
curl http://localhost:3000  # React
curl http://localhost:7071  # Function
```

---

### Clean Restart

**Stop all services:**
- Ctrl+C in all terminals

**Kill processes:**
```bash
# Windows
taskkill /IM node.exe /F

# Mac/Linux
killall node
```

**Clean build:**
```bash
rm -rf shared/dist
rm -rf dataconnectors/quodsi_data_connector_lucidchart_v2/dist
rm -rf editorextensions/quodsi_editor_extension/quodsim-react/build
npm install
npm run build -w @quodsi/shared
```

---

## Key Files and Locations

### Configuration

| File | Location | Purpose |
|------|----------|---------|
| **local.settings.json** | `dataconnectors/.../` | Azure Function config (not in git) |
| **manifest_dev.json** | `editorextensions/.../` | Extension dev config |
| **package.json** | Root | Workspace configuration |

### Build Output

| Component | Output Directory | Generated By |
|-----------|------------------|--------------|
| Shared | `shared/dist/` | `npm run build -w @quodsi/shared` |
| Function | `dataconnectors/.../dist/` | `npm run build` |
| React | `quodsim-react/build/` | `npm run build` (production) |

### Logs

| Service | Location |
|---------|----------|
| Extension | Browser console (F12) |
| React | Terminal 3 + Browser console |
| Function | Terminal 2 |
| Extension Test | Terminal 4 |

---

## Development Environment

### Local URLs

- **React Dev Server:** `http://localhost:3000`
- **Azure Function:** `http://localhost:7071`
- **LucidChart Test:** `https://lucid.app` (open manually)
- **Extension Server:** `http://localhost:9900/extension.js`
- **Shape Libraries:** `http://localhost:9901/shapeLibraries`

### Required Ports

- **3000** - React development server
- **7071** - Azure Functions runtime
- **9900** - Extension server (extension.js)
- **9901** - Shape libraries server

**Port conflicts?** See [Troubleshooting](./04_troubleshooting.md)

### Environment Variables

See [Environment Reference](./03_environment_reference.md) for complete list.

**Required for simulation:**
- `AZURE_STORAGE_CONNECTION_STRING`
- `BATCH_ACCOUNT_URL`
- `BATCH_ACCOUNT_NAME`
- `BATCH_ACCOUNT_KEY`
- `BATCH_POOL_ID`

**Not required for UI development** - you can develop extension and React without Azure credentials. Simulation submission will fail but everything else works.

---

## Testing

### Manual Testing

1. Start all services (see [Local Startup](./02_local_startup.md))
2. Browser opens to LucidChart
3. Open Quodsi panel (left sidebar)
4. Create or open test document
5. Test features:
   - Model initialization
   - Element editing
   - Validation
   - Simulation (requires Azure)

### Automated Tests

**Shared library:**
```bash
cd shared
npm test
```

**Update snapshots:**
```bash
cd shared
npm run test:update-snapshots
```

---

## Debugging

### Browser Console

**Access:** F12 → Console tab

**Key info:**
- Extension initialization logs
- Message passing (extension ↔ React)
- React component errors
- API call results

**Filter by:**
- `[SimulationHandler]`
- `[MessageRouter]`
- `[ModelPanel]`

### Azure Function Logs

**Access:** Terminal 2 (where `func start` is running)

**Key info:**
- HTTP requests received
- Function execution time
- Errors and stack traces
- Batch submission status

### React Dev Server

**Access:** Terminal 3 (where `react-scripts start` is running)

**Key info:**
- Compilation status
- Build errors/warnings
- Hot reload events

---

## Related Documentation

### Architecture Documentation

- [Messaging System](../editorextensions/quodsi_editor_extension/_docs/architecture/messaging/) - Message passing protocol
- [Simulation Flow](../editorextensions/quodsi_editor_extension/_docs/architecture/messaging/simulation/) - Complete simulation execution
- [Bootstrap Sequence](../editorextensions/quodsi_editor_extension/_docs/architecture/bootstrap/) - Extension initialization

### Root Documentation

- [GETTING_STARTED.md](../../GETTING_STARTED.md) - Quick start without explanations
- [CLAUDE.md](../../CLAUDE.md) - Project overview and patterns
- [cheatsheet.md](../../cheatsheet.md) - (Deprecated - use Quick Start instead)

### SDK Documentation

- [LUCID_SDK_REFERENCE.md](../../LUCID_SDK_REFERENCE.md) - LucidChart SDK reference
- `_docs/sdk/` - SDK examples and patterns

---

## Getting Help

### Self-Service

1. Check [Troubleshooting](./04_troubleshooting.md)
2. Search browser console (F12) for errors
3. Check terminal output for build errors
4. Verify all 4 services running

### Common Issues

- **Port conflicts:** [Troubleshooting - Port Already in Use](./04_troubleshooting.md#issue-port-already-in-use)
- **Module not found:** [Troubleshooting - Cannot Find Module](./04_troubleshooting.md#issue-cannot-find-module-quodsishared)
- **Extension not loading:** [Troubleshooting - Extension Not Loading](./04_troubleshooting.md#issue-extension-not-loading-in-browser)
- **Build failures:** [Troubleshooting - React Compilation Errors](./04_troubleshooting.md#issue-react-compilation-errors)

### Reporting Bugs

Include:
- Operating system and versions (`node --version`, `func --version`)
- Full error message and stack trace
- Steps to reproduce
- Which terminal failed (1, 2, 3, or 4)
- Browser console errors

---

## Quick Reference

### Startup Checklist

- [ ] Node.js 18+ installed
- [ ] Azure Functions Core Tools v4 installed
- [ ] Repository cloned
- [ ] `npm install` completed
- [ ] `local.settings.json` created (even if empty)
- [ ] Port 3000 available
- [ ] Port 7071 available

### Verification

- [ ] Terminal 1: Build completed without errors
- [ ] Terminal 2: Function listening on port 7071
- [ ] Terminal 3: React dev server on port 3000
- [ ] Terminal 4: Extension compiled, serving on ports 9900/9901
- [ ] Manually opened `https://lucid.app` in browser
- [ ] Extension panel visible in LucidChart sidebar

### Stop Everything

```bash
# In each terminal: Ctrl+C
# Then optionally kill all Node:
taskkill /IM node.exe /F  # Windows
killall node              # Mac/Linux
```

---

**Ready to start?** → [Prerequisites](./01_prerequisites.md)

**Already set up?** → [Quick Start Guide](../../GETTING_STARTED.md)

**Having issues?** → [Troubleshooting](./04_troubleshooting.md)
