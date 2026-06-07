# Quick Start Guide

Fast-track commands to get Quodsi running locally. Copy and paste each block into a separate terminal.

**First time?** See [detailed setup guide](./_docs/development/README.md)

**Having issues?** See [troubleshooting](./_docs/development/04_troubleshooting.md)

---

## Prerequisites

Ensure you have:
- Node.js 18+
- Git

**Verify:**
```bash
node --version
```

**If missing:** See [prerequisites guide](./_docs/development/01_prerequisites.md)

---

## Terminal 1: Build Shared Library

```bash
npm install
npm run build -w @quodsi/lucid-shared
```

**Leave this terminal open** - build only needs to run once per session.

---

## Terminal 2: Start React Dev Server

```bash
cd editorextensions/quodsi_editor_extension/quodsim-react
npx react-scripts start
```

**Expected:** Browser auto-opens to `http://localhost:3000`

**Note:** Hot reload enabled - changes auto-refresh.

---

## Terminal 3: Launch Extension Test

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

**Check services running:**
```bash
# In a new terminal
netstat -ano | findstr "3000"  # Windows
lsof -i :3000                  # Mac/Linux
```

**Test endpoints:**
```bash
curl http://localhost:3000  # React
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
```

### Module Not Found

```bash
npm run build -w @quodsi/lucid-shared
```

Then restart Terminals 2 and 3.

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
npm run build -w @quodsi/lucid-shared
```

Then restart Terminal 3 (Extension).

### Extension Changes

Restart Terminal 3 (Extension test) and refresh browser.

### React Changes

Hot reload automatic - no restart needed.

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
rm -rf editorextensions/quodsi_editor_extension/quodsim-react/build
npm install
npm run build -w @quodsi/lucid-shared
```

Then restart all 4 terminals.

---

## Project Structure

```
quodsi_lucidchart_package/
├── shared/                         # Core library (build first)
└── editorextensions/
    └── quodsi_editor_extension/
        ├── src/                    # Extension TypeScript
        └── quodsim-react/          # React UI (port 3000)
```

Simulation/data backend lives in the separate `quodsi_api` repository.

---

## Ports

- **3000** - React dev server

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
| 1 | `npm run build -w @quodsi/lucid-shared` | - | No (one-time) |
| 2 | `npx react-scripts start` | 3000 | Yes |
| 3 | `npx lucid-package@latest test-editor-extension quodsi_editor_extension` | - | No |

---

**Need more details?** → [Development Documentation](./_docs/development/README.md)

**First time setup?** → [Prerequisites Guide](./_docs/development/01_prerequisites.md)
