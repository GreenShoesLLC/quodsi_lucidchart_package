# Extension Bootstrap (Stages 1-4)

Extension-side initialization that occurs when the browser loads the extension package.

## Overview

File: `src/extension.ts`

The extension bootstrap is synchronous and deterministic, completing in ~100ms. It creates core singletons, instantiates panels, and sets up selection handling.

## Stage 1: Extension Load & Core Setup

**Lines: extension.ts:22-26**

```typescript
const client = new EditorClient();
const viewport = new Viewport(client);
(globalThis as any).lucidEditorClient = client;
```

**Actions:**
- Creates `EditorClient` - main interface to Lucid SDK
- Creates `Viewport` - monitors canvas interactions
- Stores client globally for handler access

## Stage 2: Singleton Initialization

**Lines: extension.ts:28-41**

### StorageAdapter
```typescript
const storageAdapter = new StorageAdapter();
```
- File: `src/core/StorageAdapter.ts`
- Handles persistence to Lucid document storage
- Manages shape data serialization/deserialization

### ModelManager (Singleton)
```typescript
ModelManager.initialize(client, storageAdapter);
const modelManager = ModelManager.getInstance();
```
- File: `src/core/ModelManager.ts`
- **Pattern**: Singleton via static instance
- **Responsibilities**: Model state, validation, change tracking
- **Dependencies**: EditorClient, StorageAdapter

### MessageRouter (Singleton)
```typescript
initializeMessaging(true); // Enable logging
```
- File: `src/core/messaging/index.ts` → `MessageRouter.ts`
- **Pattern**: Singleton via `MessageRouter.getInstance()`
- **Creates**:
  - `ChannelManager` for panel communication
  - Message queue system

**Schema:**
```
initializeMessaging()
  └─> MessageRouter.getInstance() [singleton]
       ├─> new ChannelManager(logFn)
       └─> window.__msgLog = logBuffer
```

## Stage 3: Panel Creation

**Lines: extension.ts:43-52**

### RightDockPanel (Model Panel)
```typescript
rightDockPanel = new RightDockPanel(client, modelManager);
rightDockPanel.setLogging(true);
```
- File: `src/panels/RightDockPanel.ts`
- **Extends**: `Panel` (Lucid SDK)
- **Implements**: `RoutablePanel` interface
- **Config**:
  - Location: PanelLocation.RightDock (right side)
  - URL: `quodsim-react/index.html?panel=model`
  - Width: 300px
  - Stores reference to ModelManager

**On construction:**
1. Calls `super()` with panel config
2. Stores modelManager reference
3. Waits for `didMount()` lifecycle event

### Panel Lifecycle Hooks

The panel implements these lifecycle methods:

**didMount()**
- Called when panel is mounted by Lucid
- Registers with MessageRouter: `router.registerChannel(role, this)`

**frameLoaded()**
- Called when iframe has loaded
- Re-registers with MessageRouter (ensure valid reference)
- Marks channel ready

**frameClosed()**
- Called when iframe removed from DOM
- Sets `isReady = false`
- Cleans up resources

## Stage 4: Selection Handler Setup

**Lines: extension.ts:54-60**

```typescript
SelectionHandler.setModelManager(modelManager);

viewport.hookSelection((items) => {
    SelectionHandler.handleLucidSelectionEvent(client, items);
});
```

**Actions:**
- Provides ModelManager reference to SelectionHandler
- Hooks viewport selection changes to handler
- When user selects shapes: viewport → SelectionHandler → MessageRouter → React panels

File: `src/core/messaging/handlers/selection/SelectionHandler.ts`

**SelectionHandler Schema:**
```
handleLucidSelectionEvent(client, items)
  ├─> Determine selection type (activity, resource, model, etc.)
  ├─> Get processor for type
  ├─> Process selection → messageData
  ├─> Update internal state
  └─> router.send('model', SELECTION_CHANGED, data)
```

## Initialization Complete

At this point:
- ✅ Extension is loaded and initialized
- ✅ Singletons created (ModelManager, MessageRouter)
- ✅ Panels created (but iframes not loaded yet)
- ✅ Selection handling configured
- ⏳ Waiting for user to click panel icon

## Panel Registration with MessageRouter

When the panel calls `router.registerChannel(role, this)`:

**MessageRouter actions:**
1. Validates panel has `relayToIframe()` method
2. Stores panel in `ChannelManager`
3. Stores panel in global registry: `window.quodsiExtension.panels[role]`

**Channel structure:**
```typescript
{
  panel: RoutablePanel,
  ready: boolean,
  queue: EnvelopeBase[]
}
```

Messages sent before `ready=true` are queued and flushed after REACT_APP_READY.

## Key Interfaces

### RoutablePanel
```typescript
interface RoutablePanel {
  relayToIframe(msg: EnvelopeBase): void;
}
```

RightDockPanel implements this to receive messages from MessageRouter.

## Next Steps

After extension bootstrap completes, the system waits for user interaction:
- User clicks panel icon → LucidChart creates iframe → React bootstrap begins
- See: [03_react_bootstrap.md](./03_react_bootstrap.md)
