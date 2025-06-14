# Error and Logging Exchange

## Overview
Error and logging messages provide bidirectional communication for debugging, error reporting, and system monitoring between the extension and React panels.

## Message Flow

### ERROR: Bidirectional

**Direction:** React ↔ Extension  
**Purpose:** Report errors that occur in either system  
**Auth Required:** No  

**Payload:**
```typescript
{
  message: string,
  details?: any,              // Additional error context
  severity: 'error' | 'warning' | 'info'
}
```

**Senders:** 
- React: Various error boundaries and catch blocks
- Extension: Error handlers throughout the system

**Handlers:**
- React: `quodsim-react/src/messaging/mappers/framework.mapper.ts`
- Extension: `src/core/messaging/handlers/frameworkHandler.ts`

---

### LOG: Bidirectional

**Direction:** React ↔ Extension  
**Purpose:** Send debugging and diagnostic information  
**Auth Required:** No  

**Payload:**
```typescript
{
  message: string,
  level: 'debug' | 'info' | 'warn' | 'error',
  data?: any                  // Optional structured data
}
```

**Senders:** 
- React: Debug utilities and diagnostic code
- Extension: Logging service and debug points

**Handlers:**
- React: `quodsim-react/src/messaging/mappers/framework.mapper.ts`
- Extension: `src/core/messaging/handlers/frameworkHandler.ts`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| ERROR | ✅ Various | ✅ FrameworkHandler.handleMessage | ✅ Various | ✅ frameworkMapper.mapMessageToAction |
| LOG | ✅ Various | ✅ FrameworkHandler.handleMessage | ✅ Various | ✅ frameworkMapper.mapMessageToAction |

## Error Reporting Patterns

### React Error Boundary
```typescript
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Send error to extension
    sendMessage(EnvelopeMessageType.ERROR, {
        message: error.message,
        details: {
            stack: error.stack,
            componentStack: errorInfo.componentStack
        },
        severity: 'error'
    });
}
```

### Extension Error Handler
```typescript
try {
    // Risky operation
    await this.performOperation();
} catch (error) {
    // Log locally
    console.error('[Handler] Operation failed:', error);
    
    // Send to React panels
    this.router.broadcastToAllChannels(EnvelopeMessageType.ERROR, {
        message: `Operation failed: ${error.message}`,
        details: { operation: 'performOperation', error: error.stack },
        severity: 'error'
    });
}
```

## Logging Patterns

### Debug Logging
```typescript
// React debug logging
if (process.env.NODE_ENV === 'development') {
    sendMessage(EnvelopeMessageType.LOG, {
        message: 'Component mounted with props',
        level: 'debug',
        data: { props, state }
    });
}

// Extension debug logging
if (this.loggingEnabled) {
    this.router.sendToChannel(channel, EnvelopeMessageType.LOG, {
        message: 'Processing message',
        level: 'debug',
        data: { messageType: msg.type, payload: msg.data }
    });
}
```

### Performance Logging
```typescript
const startTime = performance.now();
// ... operation ...
const duration = performance.now() - startTime;

sendMessage(EnvelopeMessageType.LOG, {
    message: `Operation completed in ${duration}ms`,
    level: 'info',
    data: { operation: 'dataFetch', duration }
});
```

## Implementation Details

### Framework Handler
```typescript
handleMessage(msg: EnvelopeBase): void {
    switch (msg.type) {
        case EnvelopeMessageType.ERROR:
            this.handleError(msg);
            break;
        case EnvelopeMessageType.LOG:
            this.handleLog(msg);
            break;
    }
}

private handleError(msg: EnvelopeBase): void {
    const { message, details, severity } = msg.data;
    
    // Log to console with appropriate level
    const logFn = severity === 'error' ? console.error : 
                  severity === 'warning' ? console.warn : 
                  console.info;
    
    logFn(`[${msg.source}] ${message}`, details);
    
    // Could also send to external logging service
    if (this.shouldReportToService(severity)) {
        this.reportToLoggingService(msg);
    }
}

private handleLog(msg: EnvelopeBase): void {
    const { message, level, data } = msg.data;
    
    // Only log if appropriate level
    if (this.shouldLog(level)) {
        console[level](`[${msg.source}] ${message}`, data);
    }
}
```

### React Mapper
```typescript
// In framework.mapper.ts
export const mapMessageToAction = (message: EnvelopeBase): any => {
    switch (message.type) {
        case EnvelopeMessageType.ERROR:
            // Display error to user
            return {
                type: 'SHOW_ERROR',
                error: {
                    message: message.data.message,
                    severity: message.data.severity,
                    details: message.data.details
                }
            };
            
        case EnvelopeMessageType.LOG:
            // Console log only, no UI update
            console[message.data.level](
                `[Extension] ${message.data.message}`, 
                message.data.data
            );
            return { type: 'NO_OP' };
    }
};
```

## Error Handling Strategy

### Avoid Infinite Loops
```typescript
// IMPORTANT: Don't send ERROR messages from error handlers
private handleError(msg: EnvelopeBase): void {
    try {
        // Process error
        console.error(msg.data.message);
    } catch (e) {
        // Do NOT send another ERROR message
        // Just log locally
        console.error('Failed to process error message:', e);
    }
}
```

### Error Severity Levels
- **error**: Critical failures requiring user attention
- **warning**: Non-critical issues user should know about
- **info**: Informational messages about system state

### Log Levels
- **debug**: Detailed diagnostic information
- **info**: General informational messages
- **warn**: Warning conditions
- **error**: Error conditions (different from ERROR message)

## Common Use Cases

### Development Debugging
```typescript
// Track message flow
sendLog('debug', 'Sending ELEMENT_UPDATE', { elementId, changes });

// Track state changes
sendLog('debug', 'Auth state changed', { oldState, newState });

// Performance monitoring
sendLog('info', 'Render completed', { componentName, renderTime });
```

### Production Error Reporting
```typescript
// Catch and report unexpected errors
window.addEventListener('unhandledrejection', (event) => {
    sendError('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
    }, 'error');
});
```

### User-Facing Errors
```typescript
// Validation errors
sendError('Invalid model configuration', {
    validationErrors: errors,
    elementId: element.id
}, 'warning');

// Operation failures
sendError('Failed to save changes', {
    operation: 'saveElement',
    reason: error.message
}, 'error');
```

## Best Practices

1. **Structured Logging**: Include relevant context in `data` field
2. **Appropriate Levels**: Use correct severity/level for the situation
3. **Avoid Noise**: Don't log excessively in production
4. **Error Context**: Include enough detail to debug issues
5. **No Infinite Loops**: Never send ERROR from error handlers

## Performance Considerations

- Log messages are fire-and-forget (no response expected)
- Excessive logging can impact performance
- Consider log levels and environment (dev vs production)
- Batch multiple log entries if needed

## Related Messages
- **All message types** - Can trigger ERROR on failure
- **Framework messages** - Part of same category
- **Development tools** - Often used together for debugging