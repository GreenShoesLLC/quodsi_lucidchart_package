# Quick Start Guide

Fast-track commands to get Quodsi running locally. Copy and paste each block into a separate terminal.

**First time?** See [detailed setup guide](./_docs/development/README.md)

**Having issues?** See [troubleshooting](./_docs/development/04_troubleshooting.md)

---

## Prerequisites

Ensure you have:
- Node.js 18+
- Azure Functions Core Tools v4
- Git

**Verify:**
```bash
node --version
func --version
```

**If missing:** See [prerequisites guide](./_docs/development/01_prerequisites.md)

---

## Terminal 1: Build Shared Library

```bash
npm install
npm run build -w @quodsi/shared
```

**Leave this terminal open** - build only needs to run once per session.

---

## Terminal 2: Start Azure Function

**Before starting:** Ensure `local.settings.json` is configured. Copy from `local.settings.json.template` and replace placeholder keys. See [environment guide](./editorextensions/quodsi_editor_extension/_docs/architecture/environment/04_azure_function_environment.md).

```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2
npm run build
func start --debug --verbose
```

**Expected:** Function listening on `http://localhost:7071`

---

## Terminal 3: Start React Dev Server

```bash
cd editorextensions/quodsi_editor_extension/quodsim-react
npx react-scripts start
```

**Expected:** Browser auto-opens to `http://localhost:3000`

**Note:** Hot reload enabled - changes auto-refresh.

---

## Terminal 4: Launch Extension Test

```bash
npx lucid-package@latest test-editor-extension quodsi_editor_extension
```

**Expected:**
```
Listening at http://localhost:9900/extension.js
Listening at http://localhost:9901/shapeLibraries
webpack compiled successfully
```

**Next:** Manually open LucidChart in your browser at `https://lucid.app`

**Usage:** Open Quodsi panel from right sidebar

---

## Verification

**Check all services running:**
```bash
# In a new terminal
netstat -ano | findstr "3000 7071"  # Windows
lsof -i :3000 && lsof -i :7071      # Mac/Linux
```

**Test endpoints:**
```bash
curl http://localhost:3000  # React
curl http://localhost:7071  # Function
```

---

## Common Issues

### Port Conflicts

**Windows:**
```bash
netstat -ano | findstr "3000"
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:7071 | xargs kill -9
```

### Module Not Found

```bash
npm run build -w @quodsi/shared
```

Then restart Terminals 2 and 4.

### Extension Not Loading

Hard refresh browser:
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

---

## Development Workflow

### Shared Library Changes

```bash
npm run build -w @quodsi/shared
```

Then restart Terminal 2 (Function) and Terminal 4 (Extension).

### Extension Changes

Restart Terminal 4 (Extension test) and refresh browser.

### React Changes

Hot reload automatic - no restart needed.

### Function Changes

In Terminal 2:
```bash
# Ctrl+C to stop
npm run build
func start --debug --verbose
```

---

## Stop Everything

**In each terminal:** `Ctrl+C`

**Kill all Node processes (if needed):**
```bash
taskkill /IM node.exe /F  # Windows
killall node              # Mac/Linux
```

---

## Clean Restart

```bash
rm -rf shared/dist
rm -rf dataconnectors/quodsi_data_connector_lucidchart_v2/dist
rm -rf editorextensions/quodsi_editor_extension/quodsim-react/build
npm install
npm run build -w @quodsi/shared
```

Then restart all 4 terminals.

---

## Configuration

### Azure Function Settings

**Required for:** Simulation submission (function starts without it, but simulations will fail)

**Create configuration file:**
```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2
cp local.settings.json.template local.settings.json
```

**Edit `local.settings.json`:**
- Replace all `YOUR_*_KEY` placeholders with real Azure credentials
- See [Azure Function environment guide](./editorextensions/quodsi_editor_extension/_docs/architecture/environment/04_azure_function_environment.md) for details

**Note:** Extension and React work without Azure credentials - only simulation features require them.

---

## Project Structure

```
quodsi_lucidchart_package/
├── shared/                         # Core library (build first)
├── editorextensions/
│   └── quodsi_editor_extension/
│       ├── src/                    # Extension TypeScript
│       └── quodsim-react/          # React UI (port 3000)
└── dataconnectors/
    └── quodsi_data_connector_lucidchart_v2/  # Azure Function (port 7071)
```

---

## Ports

- **3000** - React dev server
- **7071** - Azure Function

---

## Documentation

- **Detailed Setup:** [Development Guide](./_docs/development/README.md)
- **Troubleshooting:** [Common Issues](./_docs/development/04_troubleshooting.md)
- **Architecture:** [Messaging System](./editorextensions/quodsi_editor_extension/_docs/architecture/messaging/)
- **Project Overview:** [CLAUDE.md](./CLAUDE.md)

---

## Quick Reference

| Terminal | Command | Port | Hot Reload |
|----------|---------|------|------------|
| 1 | `npm run build -w @quodsi/shared` | - | No (one-time) |
| 2 | `func start --debug --verbose` | 7071 | No |
| 3 | `npx react-scripts start` | 3000 | Yes |
| 4 | `npx lucid-package@latest test-editor-extension quodsi_editor_extension` | - | No |

---

**Need more details?** → [Development Documentation](./_docs/development/README.md)

**First time setup?** → [Prerequisites Guide](./_docs/development/01_prerequisites.md)
