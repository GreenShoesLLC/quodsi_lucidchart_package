# Message Lifecycle

How messages flow through the system from sender to receiver.

## React → Extension Flow

```
User Action (e.g., click Save button)
    ↓
React component calls sendMessage()
    ↓
useSendMessage hook creates envelope
    ↓
window.parent.postMessage(envelope, '*')
    ↓
Panel.messageFromFrame() receives
    ↓
Panel forwards to MessageRouter.receive()
    ↓
MessageRouter routes to appropriate handler
    ↓
Handler processes message
    ↓
Handler may send response back to React
```

### Example: Element Update

File references:
- **Sender**: `quodsim-react/src/messaging/senders/modelOpsSender.ts`
- **Panel receiver**: `src/panels/RightDockPanel.ts:93` (messageFromFrame)
- **Router**: `src/core/messaging/MessageRouter.ts:201` (receive)
- **Handler**: `src/core/messaging/handlers/elementOpsHandler.ts`

## Extension → React Flow

```
Extension event (e.g., selection change)
    ↓
Handler creates message envelope
    ↓
MessageRouter.send(target, envelope)
    ↓
ChannelManager.enqueueOrSend()
    ↓
    If channel ready:
        Panel.relayToIframe(envelope)
            ↓
        Panel.sendMessage() → iframe
    Else:
        Add to message queue
    ↓
React window.addEventListener('message')
    ↓
useMessageListenerEffect receives
    ↓
Mapper converts to reducer action
    ↓
Dispatch updates state
    ↓
UI re-renders with new state
```

### Example: Selection Changed

File references:
- **Sender**: `src/core/messaging/handlers/selection/SelectionHandler.ts:210`
- **Router**: `src/core/messaging/MessageRouter.ts:168` (send)
- **Panel relay**: `src/panels/RightDockPanel.ts:65` (relayToIframe)
- **React receiver**: `quodsim-react/src/messaging/effects/messageListenerEffect.ts`
- **Mapper**: `quodsim-react/src/messaging/mappers/selection.mapper.ts:15` (mapSelection)

## Panel Registration

Panels must register with MessageRouter before receiving messages:

**Registration Flow:**
```
Panel.didMount()
    ↓
router.registerChannel(role, this)
    ↓
ChannelManager creates channel
    ↓
Panel stored in global registry
```

File: `src/panels/ContentDockPanel.ts:103`, `src/panels/RightDockPanel.ts:54`

## Channel Readiness

Messages are queued until channel is ready:

**Readiness Flow:**
```
React sends REACT_APP_READY
    ↓
MessageRouter.handleReactAppReady()
    ↓
ChannelManager.markChannelReady(role)
    ↓
ChannelManager.flushQueue(role)
    ↓
All queued messages sent to panel
```

File: `src/core/messaging/MessageRouter.ts:250` (handleReactAppReady)

## Message Queuing

**Before REACT_APP_READY:**
- Extension may try to send messages (e.g., selection updates)
- ChannelManager queues these messages
- Prevents message loss during initialization

**After REACT_APP_READY:**
- Channel marked ready
- Queue flushed in order
- Subsequent messages delivered directly

**Implementation:**
```typescript
// src/core/messaging/ChannelManager.ts
enqueueOrSend(role: PanelRole, msg: EnvelopeBase): void {
  const channel = this.getChannel(role);

  if (!channel.ready) {
    channel.queue.push(msg);  // Queue if not ready
  } else {
    channel.panel.relayToIframe(msg);  // Send directly
  }
}
```

## Broadcast Messaging

Extension can broadcast to all panels:

```typescript
router.send('broadcast', {
  id: generateId(),
  type: EnvelopeMessageType.AUTH_STATUS,
  source: 'host',
  target: 'broadcast',
  version: '1.0',
  data: authState
});
```

**Broadcast Flow:**
- MessageRouter sends to ALL registered channels
- Each panel receives identical message
- Used for: auth status, subscription updates

File: `src/core/messaging/MessageRouter.ts:184-190`

## Message Deduplication

React uses refs to prevent processing duplicates:

```typescript
// quodsim-react/src/messaging/MessageProvider.tsx:64
const processedMessageIds = useRef(new Set<string>());

// In message listener:
if (processedMessageIds.current.has(msg.id)) {
  return; // Already processed
}
processedMessageIds.current.add(msg.id);
```

## Error Propagation

If handler throws error:
- Error logged to console
- Extension continues operating
- May send error response to React

See: [05_troubleshooting.md](../bootstrap/05_troubleshooting.md#panel-communication-failures)

## Performance Considerations

- **Debouncing**: Selection changes debounced to prevent excessive messages
- **Queuing**: Prevents backpressure during initialization
- **Direct Delivery**: After ready, no queuing overhead
- **Broadcast Efficiency**: Single message creation, multiple deliveries
