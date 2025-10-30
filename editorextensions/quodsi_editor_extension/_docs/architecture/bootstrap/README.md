# Bootstrap Process Documentation

This folder documents the complete initialization sequence of the Quodsi LucidChart extension, from when the browser loads the extension package to when the panels are fully operational.

## Process Overview

The bootstrap process follows an 8-stage sequence:

1. **Extension Load** - Browser executes extension package
2. **Core Setup** - Singletons and services initialization
3. **Messaging System** - MessageRouter and ChannelManager setup
4. **Panel Creation** - RightDockPanel instantiation
5. **React App Load** - iframe creation and React mount
6. **React Initialization** - Effects and hooks setup
7. **Communication Handshake** - REACT_APP_READY and channel readiness
8. **Operational State** - Fully functional system

## Documentation Files

### [01_initialization_flow.md](./01_initialization_flow.md)
High-level overview with sequence diagram showing all 8 stages at a glance.

**Read this first** to understand the complete flow.

### [02_extension_bootstrap.md](./02_extension_bootstrap.md)
Extension-side initialization (Stages 1-4):
- `extension.ts` execution
- Singleton creation (ModelManager, MessageRouter)
- Panel instantiation
- SelectionHandler setup

### [03_react_bootstrap.md](./03_react_bootstrap.md)
React-side initialization (Stages 5-6):
- iframe load and React mount
- Component tree: `index.tsx` → `App.tsx` → `MessageProvider` → `LucidApp`
- Effects system and ref tracking

### [04_messaging_handshake.md](./04_messaging_handshake.md)
Communication establishment (Stages 7-8):
- REACT_APP_READY message protocol
- Multi-condition readiness checks
- Emergency timer fallback
- Message queue flushing
- Channel registration

### [05_troubleshooting.md](./05_troubleshooting.md)
Common issues and debugging:
- Race conditions
- Panel communication failures
- Logging strategies

## Quick Reference

**Where do I start?**
- New to the codebase? → Read [01_initialization_flow.md](./01_initialization_flow.md)
- Debugging extension startup? → Read [02_extension_bootstrap.md](./02_extension_bootstrap.md)
- Debugging React panel issues? → Read [03_react_bootstrap.md](./03_react_bootstrap.md)
- REACT_APP_READY not firing? → Read [04_messaging_handshake.md](./04_messaging_handshake.md)
- Initialization hangs/errors? → Read [05_troubleshooting.md](./05_troubleshooting.md)

## Key Files Referenced

**Extension Side:**
- `src/extension.ts` - Entry point
- `src/core/ModelManager.ts` - Model state singleton
- `src/core/StorageAdapter.ts` - Data persistence
- `src/core/messaging/MessageRouter.ts` - Message routing singleton
- `src/panels/RightDockPanel.ts` - Model panel

**React Side:**
- `quodsim-react/src/index.tsx` - React entry point
- `quodsim-react/src/App.tsx` - App root
- `quodsim-react/src/messaging/MessageProvider.tsx` - Message orchestration
- `quodsim-react/src/messaging/effects/` - Initialization effects
- `quodsim-react/src/features/LucidApp.tsx` - Main UI component
