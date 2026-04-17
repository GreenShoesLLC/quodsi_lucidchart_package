# Quick Start Guide (Monorepo Root)

Fast-track commands to get Quodsi running locally. **All commands assume your terminal is at the monorepo root** (`quodsi/`).

Copy and paste each block into a separate terminal.

**First time?** See [detailed setup guide](./quodsi_lucidchart_package/_docs/development/README.md)

**Having issues?** See [troubleshooting](./quodsi_lucidchart_package/_docs/development/04_troubleshooting.md)

---

## Prerequisites

Ensure you have:
- Node.js 18+
- Azure Functions Core Tools v4
- Python 3.12+ (for quodsi_api)
- Git

**Verify:**
```bash
node --version
func --version
python --version
```

**First-time Quodsi API setup** (only once):
```bash
cd quodsim
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux
cd quodsi_api
pip install -r requirements.txt
cp .env.example .env         # then edit .env with your Kinde + DB settings
python -m alembic upgrade head
```

**If missing:** See [prerequisites guide](./quodsi_lucidchart_package/_docs/development/01_prerequisites.md)

---

## Terminal 1: Build Shared Library

```bash
cd quodsi_lucidchart_package && npm install
npm run build -w @quodsi/shared
```

**Leave this terminal open** - build only needs to run once per session.

---


**Expected:** Function listening on `http://localhost:7071`

---

## Terminal 3: Start React Dev Server

```bash
cd quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react
npx react-scripts start
```

**Expected:** Browser auto-opens to `http://localhost:3000`

**Note:** Hot reload enabled - changes auto-refresh.

---

## Terminal 4: Start Quodsi API

```bash
cd quodsim\quodsi_api
C:\_source\quodsi\quodsim\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Expected:** `Application startup complete` on `http://localhost:8000`

**Verify:** Open `http://localhost:8000/docs` — Swagger UI with all endpoints including `/lucid/SyncUser`

**Note:** Hot reload enabled — source changes auto-restart.

---

## Terminal 5: Launch Extension Test

```bash
cd quodsi_lucidchart_package && npx lucid-package@latest test-editor-extension quodsi_editor_extension
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

## Shortcut: Launch Everything via VS Code Task

Instead of running 5 terminals manually, VS Code's `Run All` task launches them in parallel:

- Open VS Code at `C:\_source\quodsi\quodsi_lucidchart_package`
- Press `Ctrl+Shift+B` and select `Run All`, or use Terminal > Run Task > `Run All`
- All 5 services start in dedicated terminal panels (Watch Shared, Azure Function, Quodsi API, ReactApp, LucidPackage)

See `.vscode/tasks.json` in the `quodsi_lucidchart_package` workspace for the task definitions.

---

## Verification

**Check all services running:**
```bash
# In a new terminal
netstat -ano | findstr "3000 7071 8000"  # Windows
lsof -i :3000 && lsof -i :7071 && lsof -i :8000  # Mac/Linux
```

**Test endpoints:**
```bash
curl http://localhost:3000        # React
curl http://localhost:7071        # Function
curl http://localhost:8000/health # Quodsi API
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
lsof -ti:8000 | xargs kill -9
```

### Module Not Found

```bash
cd quodsi_lucidchart_package && npm run build -w @quodsi/shared
```

Then restart Terminals 2, 4, and 5.

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
cd quodsi_lucidchart_package && npm run build -w @quodsi/shared
```

Then restart Terminal 2 (Function) and Terminal 5 (Extension).

### Extension Changes

Restart Terminal 5 (Extension test) and refresh browser.

### React Changes

Hot reload automatic - no restart needed.

### Function Changes

In Terminal 2:
```bash
# Ctrl+C to stop
npm run build
func start --debug --verbose
```

### Quodsi API Changes

Hot reload automatic - uvicorn restarts on source changes.

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
rm -rf quodsi_lucidchart_package/shared/dist
rm -rf quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react/build
cd quodsi_lucidchart_package && npm install
npm run build -w @quodsi/shared
```

Then restart all 5 terminals.

---

## Project Structure

```
quodsi/                                    # ← you are here (monorepo root)
├── quodsi_lucidchart_package/
│   ├── shared/                            # Core library (build first)
│   └── editorextensions/
│       └── quodsi_editor_extension/
│           ├── src/                       # Extension TypeScript
│           └── quodsim-react/             # React UI (port 3000)
└── quodsim/
    ├── venv/                              # Python virtual environment
    └── quodsi_api/                        # FastAPI backend (port 8000)
```

---

## Ports

- **3000** - React dev server
- **7071** - Azure Function
- **8000** - Quodsi API (FastAPI)

---

## Documentation

- **Detailed Setup:** [Development Guide](./quodsi_lucidchart_package/_docs/development/README.md)
- **Troubleshooting:** [Common Issues](./quodsi_lucidchart_package/_docs/development/04_troubleshooting.md)
- **Architecture:** [Messaging System](./quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/_docs/architecture/messaging/)
- **Project Overview:** [CLAUDE.md](./quodsi_lucidchart_package/CLAUDE.md)

---

## Quick Reference

| Terminal | Command | Port | Hot Reload |
|----------|---------|------|------------|
| 1 | `cd quodsi_lucidchart_package && npm run build -w @quodsi/shared` | - | No (one-time) |
| 2 | `cd quodsi_lucidchart_package/dataconnectors/... && func start` | 7071 | No |
| 3 | `cd quodsi_lucidchart_package/editorextensions/.../quodsim-react && npx react-scripts start` | 3000 | Yes |
| 4 | `cd quodsim/quodsi_api && python -m uvicorn app.main:app --reload --port 8000` | 8000 | Yes |
| 5 | `cd quodsi_lucidchart_package && npx lucid-package@latest test-editor-extension quodsi_editor_extension` | - | No |

**Shortcut:** Open `quodsi_lucidchart_package` in VS Code and press `Ctrl+Shift+B` → `Run All` to launch terminals 2-5 in parallel.

---

**Need more details?** → [Development Documentation](./quodsi_lucidchart_package/_docs/development/README.md)

**First time setup?** → [Prerequisites Guide](./quodsi_lucidchart_package/_docs/development/01_prerequisites.md)
