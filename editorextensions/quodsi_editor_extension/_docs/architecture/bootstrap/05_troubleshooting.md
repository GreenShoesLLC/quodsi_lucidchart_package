# Troubleshooting Bootstrap Issues

Common initialization problems and debugging strategies.

## Common Issues

### 1. REACT_APP_READY Never Sent

**Symptoms:**
- Panel loads but shows blank/frozen UI
- No messages flowing between extension and React
- Extension message queue keeps growing

**Diagnosis:**

Check browser console for:
```
[ReactAppReadyEffects] Conditions for REACT_APP_READY check:
  appInitialized: false/true
```

**Common Causes:**

**A. App initialization stuck**
- Verify initialization effects are running
- Look for `state.app.initialized = true` in logs

**Fix:**
```typescript
// Verify URL in browser console
console.log(window.location.search); // Should show ?panel=model
```

**B. Emergency timer not firing**
- Emergency timer should fire after 3s
- Check for `EMERGENCY: Forcing REACT_APP_READY` in logs
- If emergency timer doesn't fire, check effect dependencies

**C. Effect dependencies stale**
- React useEffect not re-running
- Ref not updating

**Fix:**
- Ensure `useReactAppReadyEffect` has correct dependency array
- Check that `hasSentReadyRef.current` is false

### 2. Panel Reference Lost

**Symptoms:**
- Error: `Cannot relay to iframe - no panel found`
- Messages not reaching React panels
- Panel registered but messages queued forever

**Diagnosis:**

Check extension console for:
```
[MessageRouter] No channel found for model
[MessageRouter] Channel model doesn't have valid panel
```

**Cause:**
- Panel re-registration without proper reference
- `relayToIframe` method not found on panel

**Fix:**

Panel recovery mechanism should activate:
```typescript
// In extension console:
window.quodsiExtension.panels.auth // Should exist
window.quodsiExtension.panels.model // Should exist
```

Manual recovery:
```typescript
// In extension console:
const router = window.quodsiExtension.router;
const panel = window.quodsiExtension.panels.model;
router.registerChannel('model', panel);
```

### 3. Race Condition in Selection

**Symptoms:**
- First selection doesn't update UI
- Selection updates arrive before REACT_APP_READY
- Queued selection messages lost

**Cause:**
- User selects shapes before React ready
- Messages queued but not properly flushed

**Diagnosis:**
```
[MessageRouter] Queueing message: SELECTION_CHANGED to model
[MessageRouter] Channel not ready, adding to queue
```

**Fix:**
- Verify queue flushing in `handleReactAppReady`
- Check `channelManager.flushQueue()` is called
- Ensure panel.relayToIframe() succeeds during flush

**Prevention:**
- Message queuing system handles this automatically
- No user action needed - architectural solution

### 4. Panel Communication Failures

**Symptoms:**
- Messages sent from React but not received by extension
- Messages sent from extension but not received by React
- Console errors about message format

**Diagnosis:**

**React → Extension:**
```
[MessageProvider] Sending message: AUTH_LOGIN_REQUEST
[ContentDockPanel] messageFromFrame called
[MessageRouter] Received message: AUTH_LOGIN_REQUEST
```

**Extension → React:**
```
[MessageRouter] Sending message: AUTH_STATUS to model
[RightDockPanel] relayToIframe called
[MessageHandlers] Received: AUTH_STATUS
```

**Common Causes:**

**A. Invalid message envelope**
- Missing required fields (id, type, source, target, version)
- Type guard `isEnvelope()` failing

**Fix:**
```typescript
// Verify message structure
console.log('Message envelope:', msg);
// Should have: id, type, source, target, version, data
```

**B. postMessage blocked**
- iframe not loaded
- iframe from different origin (CORS)
- Panel not visible

**Check:**
```typescript
// In extension console:
contentDockPanel.loaded // Should be true
rightDockPanel.loaded // Should be true
```

**C. Message handler not registered**
- MessageHandlers missing handler for type
- Handler returns false (not handled)

**Fix:**
```typescript
// In extension console:
MessageHandlers.handleMessage(testMsg); // Should return true
```

## Debugging Strategies

### Enable Logging

**Extension side:**
```typescript
// In extension.ts (already enabled):
contentDockPanel.setLogging(true);
rightDockPanel.setLogging(true);
initializeMessaging(true);
```

**React side:**
```typescript
// In development mode (automatic):
enableLogging: process.env.NODE_ENV === 'development'
```

### Inspect Message Log

**Extension:**
```typescript
// In extension console:
window.__msgLog // Ring buffer of last 100 messages
```

**React:**
```typescript
// In React console:
window.__quodsiDebug // Debug service instance
window.__quodsiDebug.getAllLogs() // All logged messages
```

### Monitor Initialization Progress

**Extension:**
```typescript
// Extension ready checklist:
ModelManager.getInstance() // Should exist
MessageRouter.getInstance() // Should exist
window.quodsiExtension.panels.model // Should exist
```

**React:**
```typescript
// React ready checklist:
// In React console within iframe context:
window.__reactAppReady // Should be true after REACT_APP_READY sent
```

### Trace Message Flow

**For a specific message type:**

1. **React sends message:**
   - Set breakpoint in `sendMessage()` hook
   - Verify `window.parent.postMessage()` called

2. **Extension receives:**
   - Set breakpoint in panel's `messageFromFrame()`
   - Verify envelope validation passes

3. **Router processes:**
   - Set breakpoint in `MessageRouter.receive()`
   - Check message handler invoked

4. **Extension responds:**
   - Set breakpoint in `MessageRouter.send()`
   - Verify `channelManager.enqueueOrSend()` called

5. **React receives:**
   - Set breakpoint in `useMessageListenerEffect` handler
   - Verify dispatch called

### Network Tab Monitoring

**Check for:**
- iframe loading: `quodsim-react/index.html`
- Data connector API calls

**Expected timeline:**
```
0ms:    index.html requested
100ms:  index.html loaded
150ms:  JavaScript bundle loaded
200ms:  React mounted
250ms:  REACT_APP_READY sent
```

### React DevTools

**Check component hierarchy:**
```
<App>
  <MessageProvider>  ← State should show selection, simulation, validation
    <LucidApp>
      <ModelPanel>  ← Should render based on state
```

**Check MessageProvider state:**
- `app.initialized` should be `true`

## Development Tips

### Local Development Mode

Use `npm start` for faster iteration:
```bash
# In quodsim-react/:
npm start
```

**Changes take effect immediately:**
- No need to rebuild extension
- Hot module replacement works
- Console logs visible in browser

### Test Mode for Extension

```bash
# From repo root:
npm start
```

**Benefits:**
- Faster extension reload
- Can modify TypeScript and see changes
- Better debugging experience

### Isolated Testing

**Test React app in standalone mode:**
```bash
cd quodsim-react
npm start
# Visit http://localhost:3000?panel=model
```

**Test messaging in isolation:**
```typescript
// In React console:
const testMsg = {
  id: 'test',
  type: 'SELECTION_CHANGED',
  source: 'host',
  target: 'model-iframe',
  version: '1.0',
  data: { selectedElements: [] }
};
window.postMessage(testMsg, '*');
```

### Common Console Commands

**Extension debugging:**
```typescript
// Get router state
MessageRouter.getInstance().dumpChannelState();

// Force send message
MessageRouter.getInstance().send('model', {
  id: 'manual_test',
  type: 'SELECTION_CHANGED',
  source: 'host',
  target: 'model-iframe',
  version: '1.0',
  data: { selectedElements: [] }
});

// Check panel registration
window.quodsiExtension.panels
```

**React debugging:**
```typescript
// Force REACT_APP_READY (if stuck)
window.parent.postMessage({
  id: 'manual_ready',
  type: 'REACT_APP_READY',
  source: 'model-iframe',
  target: 'host',
  version: '1.0',
  data: { panel: 'model' }
}, '*');
```

## Error Patterns

### TypeError: Cannot read property 'relayToIframe' of undefined

**Cause:** Panel reference lost in MessageRouter

**Fix:** See "Panel Reference Lost" above

### Infinite loop in useEffect

**Cause:** Effect dependency array includes object/array that changes every render

**Fix:** Use refs for objects that shouldn't trigger re-renders

### postMessage: Failed to execute on 'Window': target origin differs

**Cause:** React app trying to send to wrong origin

**Fix:** Always use `window.parent.postMessage(msg, '*')` in iframe

## Prevention Checklist

Before deploying changes to bootstrap code:

- [ ] Test model panel initialization
- [ ] Test with network throttling (slow 3G)
- [ ] Test rapid panel open/close cycles
- [ ] Verify emergency timer fires if needed
- [ ] Check message queue flushes properly
- [ ] Verify panel recovery from global registry works
- [ ] Test selection while panel initializing (queue system)
- [ ] Check browser console for errors/warnings
- [ ] Verify REACT_APP_READY sent within 3 seconds

## When to Ask for Help

If you encounter:
- REACT_APP_READY not sent after 5+ seconds (emergency timer should fire at 3s)
- Repeated panel recovery failures
- State corruption or invalid data
- Build errors in messaging system

Check:
1. This troubleshooting guide
2. Related architecture docs
3. Git history for recent messaging changes
4. GitHub issues for similar problems

Then create detailed issue report with:
- Browser console logs (both extension and React)
- Network tab screenshots
- Reproduction steps
- Environment (dev/test/prod)
