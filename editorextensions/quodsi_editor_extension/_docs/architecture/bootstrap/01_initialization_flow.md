# Initialization Flow Overview

Complete initialization sequence from browser load to operational state.

## 8-Stage Process

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Extension Load & Core Setup                       │
│ - Browser loads extension package                          │
│ - extension.ts executes                                    │
│ - Creates EditorClient, Viewport                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Singleton Initialization                          │
│ - StorageAdapter created                                   │
│ - ModelManager.initialize() (singleton)                    │
│ - initializeMessaging() → MessageRouter singleton          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: Panel Creation                                    │
│ - RightDockPanel (model) instantiated                      │
│ - Panel registers with MessageRouter                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 4: Selection Handler Setup                           │
│ - SelectionHandler.setModelManager()                       │
│ - viewport.hookSelection() → SelectionHandler             │
│ - Extension now waiting for user interaction              │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   [User clicks panel icon]
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 5: React App Load                                    │
│ - LucidChart creates iframe with panel URL                │
│ - Browser loads quodsim-react/index.html                  │
│ - index.tsx executes, mounts React app                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 6: React Initialization                              │
│ - App.tsx renders                                         │
│ - MessageProvider initializes messaging state             │
│ - Effects begin initialization                            │
│ - Refs track initialization: hasSentReadyRef, etc.        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 7: Communication Handshake                           │
│ - React determines readiness conditions met                │
│ - Sends REACT_APP_READY to extension                      │
│ - MessageRouter.handleReactAppReady():                    │
│   • Marks channel ready                                   │
│   • Flushes queued messages                               │
│   • Requests MODEL_CONTEXT from panel                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 8: Operational State                                 │
│ - Bidirectional messaging active                           │
│ - Selection sync working                                   │
│ - User can interact with panels                            │
└─────────────────────────────────────────────────────────────┘
```

## Stage Groupings

**Extension Bootstrap (Stages 1-4)**
See: [02_extension_bootstrap.md](./02_extension_bootstrap.md)

All extension-side initialization before React involvement.

**React Bootstrap (Stages 5-6)**
See: [03_react_bootstrap.md](./03_react_bootstrap.md)

React app loading and initialization, including effects and auth.

**Handshake & Operational (Stages 7-8)**
See: [04_messaging_handshake.md](./04_messaging_handshake.md)

Communication establishment and transition to operational state.

## Key Timing Points

| Event | Typical Duration | Notes |
|-------|-----------------|-------|
| Extension load (Stages 1-4) | ~100ms | Synchronous, deterministic |
| User clicks icon → iframe load | Variable | User action required |
| React mount → initialized | ~200-500ms | Depends on bundle size |
| REACT_APP_READY trigger | Max 3000ms | Emergency timer ensures firing |
| Full initialization | ~1-3 seconds | From extension load to operational |

## Critical Path

The critical path for REACT_APP_READY is:
1. `state.app.initialized = true` (app initialized)
2. All initialization effects complete

Emergency timer forces REACT_APP_READY after 3 seconds if normal flow stalls.

## Next Steps

- **Understand extension side**: Read [02_extension_bootstrap.md](./02_extension_bootstrap.md)
- **Understand React side**: Read [03_react_bootstrap.md](./03_react_bootstrap.md)
- **Debug initialization**: Read [05_troubleshooting.md](./05_troubleshooting.md)
