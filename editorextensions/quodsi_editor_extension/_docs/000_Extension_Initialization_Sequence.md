# Lucid Extension Initialization Sequence

This document describes the complete initialization sequence of the Quodsi LucidChart extension from when the browser loads the extension to when the panels are ready for user interaction.

## Overview

The Quodsi extension follows a multi-stage initialization process that sets up core services, creates UI panels, and establishes communication channels between the extension host and React applications.

## Initialization Stages

### Stage 1: Extension Load and Core Setup

When LucidChart loads the extension package, it executes `extension.ts`:

```typescript
// extension.ts - Entry point
const client = new EditorClient();
const viewport = new Viewport(client);
```

**Key Actions:**
1. Creates `EditorClient` - main interface to Lucid SDK
2. Creates `Viewport` - for monitoring canvas interactions
3. Initializes `StorageAdapter` - handles persistence to document storage
4. Initializes `ModelManager` singleton - manages simulation model state

### Stage 2: Messaging System Initialization

```typescript
// When useNewMessaging = true (current default)
initializeMessaging(true); // Enable logging
```

**What happens in initializeMessaging():**
1. Creates singleton `MessageRouter` instance
2. Sets up `ChannelManager` for panel communication
3. Initializes `RouterState` for global state management
4. Prepares message queuing system for panels not yet ready

### Stage 3: Panel Creation

The extension creates two panels that appear as icons in LucidChart's UI:

```typescript
// Left side panel - Authentication
contentDockPanel = new ContentDockPanel(client);
contentDockPanel.setLogging(true);

// Right side panel - Model editing
rightDockPanel = new RightDockPanel(client, modelManager);
rightDockPanel.setLogging(true);
```

**Panel Configuration:**
- **ContentDockPanel**: 
  - Location: Left content dock
  - URL: `quodsim-react/index.html?panel=auth`
  - Purpose: Authentication and user management
  - Icon: Lucid favicon (temporary)

- **RightDockPanel**:
  - Location: Right dock
  - URL: `quodsim-react/index.html?panel=model`
  - Purpose: Model editing and simulation controls
  - Access to ModelManager for model operations

### Stage 4: Selection Handler Setup

```typescript
// Initialize selection handling
SelectionHandler.setModelManager(modelManager);

// Hook viewport selection changes
viewport.hookSelection((items) => {
    SelectionHandler.handleLucidSelectionEvent(client, items);
});
```

**Selection Flow:**
1. User selects shapes in LucidChart canvas
2. Viewport triggers selection hook
3. SelectionHandler processes selected items
4. Converts Lucid blocks to simulation objects
5. Broadcasts selection to all panels via MessageRouter

### Stage 5: React Application Loading

When user clicks a panel icon, LucidChart creates an iframe loading the React app:

```
User clicks panel icon
    ↓
LucidChart creates iframe with panel URL
    ↓
React app loads (index.tsx)
    ↓
App identifies panel type from URL params
    ↓
Renders App_new with appropriate panel type
```

### Stage 6: React App Initialization

The React application follows its own initialization sequence:

```typescript
// index.tsx
const panelType = urlParams.get("panel") === "auth" ? "auth" : "model";

// App_new.tsx
<MsalProvider instance={msalInstance}>
  <MessageProvider initialPanelType={panelType}>
    <LucidApp panelType={panelType} />
  </MessageProvider>
</MsalProvider>
```

**React Initialization Steps:**
1. MSAL provider setup for authentication
2. MessageProvider initialization with modular hooks
3. Silent authentication attempt (localStorage + MSAL cache)
4. Panel-specific component rendering

### Stage 7: Communication Handshake

The final stage establishes communication between extension and React app:

```
React App Ready Conditions:
- App initialized (state.app.initialized = true)
- Panel type identified
- Silent auth completed (!state.auth.silentAuthInProgress)
    ↓
Send REACT_APP_READY message
    ↓
Extension receives in messageFromFrame()
    ↓
MessageRouter.handleReactAppReady()
    ↓
Channel marked as ready
    ↓
Flush queued messages
    ↓
Send current state to panel
```

### Stage 8: Operational State

Once initialization completes:

1. **Panels are ready** for user interaction
2. **Message routing** is active between extension and panels
3. **Selection synchronization** updates panels when shapes are selected
4. **Authentication state** is established and persisted
5. **Model operations** can be performed through UI

## Complete Initialization Sequence Diagram

```
Browser loads extension package
    ↓
extension.ts executes
    ↓
Create EditorClient & Viewport
    ↓
Initialize StorageAdapter
    ↓
Initialize ModelManager (singleton)
    ↓
Initialize Messaging System
    ├─→ Create MessageRouter
    ├─→ Setup ChannelManager
    └─→ Initialize RouterState
    ↓
Create Panel Instances
    ├─→ ContentDockPanel (auth)
    └─→ RightDockPanel (model)
    ↓
Setup SelectionHandler
    ↓
Hook viewport selection events
    ↓
Extension ready, waiting for user
    ↓
[User clicks panel icon]
    ↓
LucidChart creates iframe
    ↓
React app loads & initializes
    ├─→ Setup MSAL authentication
    ├─→ Initialize MessageProvider
    ├─→ Attempt silent auth
    └─→ Render panel UI
    ↓
React sends REACT_APP_READY
    ↓
Extension marks channel ready
    ↓
Bidirectional communication established
    ↓
System fully operational
```

## Key Initialization Patterns

### 1. Singleton Pattern
- `ModelManager` - ensures single source of truth for model state
- `MessageRouter` - centralizes all message routing

### 2. Lazy Loading
- Panels only load React app when user clicks icon
- Reduces initial extension load time

### 3. Message Queuing
- Messages sent before panel ready are queued
- Flushed once REACT_APP_READY received

### 4. Multi-Layer Auth Check
- MSAL cache check
- localStorage persistence
- Silent authentication attempt
- Emergency timeout fallback

### 5. Type-Safe Messaging
- Envelope-based protocol
- TypeScript interfaces for all messages
- Runtime validation with type guards

## Common Initialization Issues

1. **Race Conditions**
   - Solution: Message queuing until panel ready
   - Emergency timeout ensures initialization completes

2. **Authentication Delays**
   - Solution: Multiple auth check mechanisms
   - localStorage provides immediate state

3. **Panel Communication Failures**
   - Solution: Robust retry mechanisms
   - Extensive logging for debugging

4. **Selection Sync Issues**
   - Solution: SelectionHandler buffers and validates
   - Ensures consistent state across panels

## Development Tips

1. **Enable Logging**: Both panels have `setLogging(true)` for debugging
2. **Check Console**: Browser console shows detailed initialization logs
3. **Network Tab**: Monitor iframe loading and API calls
4. **Test Mode**: Use `npm start` for faster development iteration
5. **Message Tracing**: Follow messages through Router logs

## Future Improvements

The current refactoring (`feature/refactoring_messaging`) aims to:
- Further modularize initialization
- Improve error recovery
- Support additional platforms (MIRO, Canva)
- Enhance type safety throughout