# Error Handling Strategy for Autosave

## Current Error Handling Approach

The current manual save process has limited error handling capabilities:

1. **Client-Side Error Handling**:
   - No pre-validation before save attempt
   - Minimal error feedback for invalid inputs
   - No specific error recovery mechanisms

2. **Extension Error Communication**:
   - The extension sends an ERROR message type on failure
   - Generic error messages without specific resolution guidance
   - Errors displayed as temporary notifications

3. **Recovery Process**:
   - After an error, users must manually fix and retry
   - No state preservation after errors
   - No distinction between different error types

Example current error handling flow:
```typescript
// In QuodsiApp.tsx
try {
  sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
    elementId,
    type: state.currentElement?.metadata?.type || SimulationObjectType.None,
    data: {
      ...data,
      id: elementId,
    },
  });
} catch (error) {
  console.error("Error updating element:", error);
  // No specific error handling beyond logging
}

// In ModelPanel.ts
this.messaging.onMessage(MessageTypes.ERROR, (payload) => {
  this.logError('Error received:', payload);
  // Simply log the error, no recovery action
});
```

## Enhanced Error Handling for Autosave

A robust autosave implementation requires comprehensive error handling to maintain data integrity and user trust. The following strategies address different error scenarios:

### 1. Validation Errors

Validation errors occur when user input fails to meet requirements:

```typescript
// Pre-validation before autosave
const validateField = (fieldName: string, value: any) => {
  const validator = validators.find(v => v.field === fieldName);
  if (!validator) return true; // No validator means valid
  
  const error = validator.validate(value);
  if (error) {
    // Track validation error
    setValidationErrors(prev => [
      ...prev.filter(e => e.fieldName !== fieldName),
      { fieldName, message: error }
    ]);
    return false;
  }
  
  // Clear any previous errors for this field
  setValidationErrors(prev => prev.filter(e => e.fieldName !== fieldName));
  return true;
};

// Use in debouncedSave
if (!validateField(fieldName, localData[fieldName])) {
  // Cancel autosave if validation fails
  console.log(`Autosave canceled for ${fieldName} due to validation error`);
  setAutoSaveState(fieldName, 'error');
  return;
}
```

### 2. Network/Communication Errors

When communication between React and the extension fails:

```typescript
const performAutosave = async (fieldName: string, data: any) => {
  try {
    setAutoSaveState(fieldName, 'saving');
    
    // Attempt to send the update message
    await sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
      elementId: data.id,
      type: data.type,
      data
    });
    
    // Handle success
    setAutoSaveState(fieldName, 'success');
    setTimeout(() => setAutoSaveState(fieldName, 'idle'), 2000);
    
  } catch (error) {
    console.error(`Autosave failed for ${fieldName}:`, error);
    setAutoSaveState(fieldName, 'error');
    
    // Store failed save for retry
    setFailedSaves(prev => ({
      ...prev,
      [fieldName]: { data, error, timestamp: Date.now() }
    }));
    
    // Show recovery UI
    setShowRetryPrompt(true);
  }
};
```

### 3. Extension Processing Errors

When the extension fails to process a valid update:

```typescript
// In the extension message handler
this.messaging.onMessage(MessageTypes.UPDATE_ELEMENT_DATA, async (data) => {
  try {
    await this.modelManager.saveElementData(
      element,
      data.data,
      data.type,
      currentPage
    );
    
    // Send success confirmation
    this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
      elementId: data.elementId
    });
  } catch (error) {
    // Send detailed error information
    this.sendTypedMessage(MessageTypes.ERROR, {
      elementId: data.elementId,
      errorType: this.categorizeError(error),
      errorMessage: error.message,
      recoverable: true,
      suggestedAction: this.getSuggestedAction(error)
    });
  }
});
```

### 4. Error Recovery Mechanisms

Implement specific recovery paths for different error types:

```typescript
// Recovery options component
const AutosaveErrorRecovery = ({ failedSaves, onRetry, onDiscard }) => {
  if (Object.keys(failedSaves).length === 0) return null;
  
  return (
    <div className="quodsi-autosave-recovery">
      <h4>Unsaved Changes</h4>
      <p>Some changes couldn't be saved automatically.</p>
      
      <ul className="quodsi-failed-saves-list">
        {Object.entries(failedSaves).map(([fieldName, save]) => (
          <li key={fieldName}>
            {fieldName}: {getErrorDescription(save.error)}
            <button onClick={() => onRetry(fieldName)}>Retry</button>
            <button onClick={() => onDiscard(fieldName)}>Discard</button>
          </li>
        ))}
      </ul>
      
      <div className="quodsi-recovery-actions">
        <button onClick={() => onRetry('all')}>Retry All</button>
        <button onClick={() => onDiscard('all')}>Discard All</button>
      </div>
    </div>
  );
};
```

### 5. Error Categorization

Categorize errors to provide appropriate responses:

```typescript
// Error types enum
enum AutosaveErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  PERMISSION = 'permission',
  CONFLICT = 'conflict',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

// Error categorization function
const categorizeError = (error: any): AutosaveErrorType => {
  if (error.name === 'ValidationError') return AutosaveErrorType.VALIDATION;
  if (error.name === 'NetworkError' || error.message.includes('network')) return AutosaveErrorType.NETWORK;
  if (error.status === 403 || error.message.includes('permission')) return AutosaveErrorType.PERMISSION;
  if (error.status === 409 || error.message.includes('conflict')) return AutosaveErrorType.CONFLICT;
  if (error.status >= 500) return AutosaveErrorType.SERVER;
  return AutosaveErrorType.UNKNOWN;
};

// Suggested actions based on error type
const getSuggestedAction = (errorType: AutosaveErrorType): string => {
  switch (errorType) {
    case AutosaveErrorType.VALIDATION:
      return 'Check the input values and try again';
    case AutosaveErrorType.NETWORK:
      return 'Check your internet connection and try again';
    case AutosaveErrorType.PERMISSION:
      return 'You may not have permission to edit this field';
    case AutosaveErrorType.CONFLICT:
      return 'This field was modified by another user, please refresh';
    case AutosaveErrorType.SERVER:
      return 'Server error occurred, please try again later';
    default:
      return 'An unknown error occurred';
  }
};
```

### 6. Graceful Degradation

Implement fallback mechanisms when autosave repeatedly fails:

```typescript
// Track consecutive failures
const [autosaveFailures, setAutosaveFailures] = useState<{
  [fieldName: string]: number;
}>({});

// In error handler
if (error) {
  // Increment failure count
  setAutosaveFailures(prev => ({
    ...prev,
    [fieldName]: (prev[fieldName] || 0) + 1
  }));
  
  // If too many failures, disable autosave for this field
  if (autosaveFailures[fieldName] >= 3) {
    setAutoSaveFields(prev => prev.filter(f => f !== fieldName));
    
    // Show notification
    setNotification({
      type: 'warning',
      message: `Autosave disabled for ${fieldName} after multiple failures`,
      action: {
        label: 'Re-enable',
        handler: () => {
          setAutoSaveFields(prev => [...prev, fieldName]);
          setAutosaveFailures(prev => {
            const newState = {...prev};
            delete newState[fieldName];
            return newState;
          });
        }
      }
    });
  }
}
```

### 7. Local Backup Strategy

Implement local storage backup to prevent data loss:

```typescript
// Save to local storage when autosave fails
const backupToLocalStorage = (elementId: string, fieldName: string, value: any) => {
  try {
    const backupKey = `quodsi_autosave_backup_${elementId}_${fieldName}`;
    const backup = {
      value,
      timestamp: new Date().toISOString(),
      sessionId: getCurrentSessionId()
    };
    
    localStorage.setItem(backupKey, JSON.stringify(backup));
    return true;
  } catch (e) {
    console.warn('Failed to backup to localStorage:', e);
    return false;
  }
};

// Check for backups on component mount
useEffect(() => {
  const checkForBackups = () => {
    if (!elementId) return;
    
    // Look for backups matching this element
    const backups = findBackupsForElement(elementId);
    if (backups.length > 0) {
      setUnsavedBackups(backups);
      setShowBackupRecoveryPrompt(true);
    }
  };
  
  checkForBackups();
}, [elementId]);
```

### 8. User Communication

Ensure clear communication about error states:

```tsx
{/* Field-level error indicator */}
{autoSaveState[fieldName] === 'error' && (
  <div className="quodsi-autosave-error-indicator">
    <span className="quodsi-error-icon">⚠️</span>
    <span className="quodsi-error-text">
      Save failed: {getErrorMessage(failedSaves[fieldName]?.error)}
    </span>
    <button 
      className="quodsi-retry-button"
      onClick={() => retryAutosave(fieldName)}
    >
      Retry
    </button>
  </div>
)}

{/* Global notification component */}
{notification && (
  <div className={`quodsi-notification quodsi-notification-${notification.type}`}>
    <p>{notification.message}</p>
    {notification.action && (
      <button onClick={notification.action.handler}>
        {notification.action.label}
      </button>
    )}
    <button 
      className="quodsi-notification-close" 
      onClick={() => setNotification(null)}
    >
      ✕
    </button>
  </div>
)}
```

## Implementation Priority Matrix

When implementing error handling for autosave, we recommend this priority order:

1. **Validation Error Handling**: Prevent invalid data from attempting to save
2. **Basic Error Display**: Show when autosave fails and why
3. **Retry Mechanism**: Allow users to retry failed saves
4. **Error Categorization**: Provide specific guidance based on error type
5. **Local Backup**: Implement localStorage backup for failed saves
6. **Advanced Recovery**: Add comprehensive recovery options
7. **Graceful Degradation**: Automatically fall back to manual save when needed
8. **Analytics**: Track error patterns to improve the system

This prioritization ensures the most critical error handling components are implemented first, with more advanced features added as the system matures.

## Integration with Existing Error Handling

The enhanced error handling should integrate with existing mechanisms:

```typescript
// In the messageHandlers file
export const messageHandlers: Partial<{
  [T in MessageTypes]: MessageHandler<T>;
}> = {
  // ... existing handlers
  
  [MessageTypes.ERROR]: (data, { setState, setError }) => {
    console.error("[MessageHandlers] Received ERROR:", data);
    
    setState(prev => ({
      ...prev,
      isProcessing: false,
      autoSaveState: {
        ...prev.autoSaveState,
        [data.elementId]: {
          status: 'error',
          errorType: data.errorType || 'unknown',
          errorMessage: data.error,
          timestamp: Date.now()
        }
      }
    }));
    
    // Enhanced error handling
    if (data.recoverable) {
      // Show recovery UI
      setState(prev => ({
        ...prev,
        recoverableErrors: {
          ...prev.recoverableErrors,
          [data.elementId]: {
            error: data.error,
            errorType: data.errorType,
            suggestedAction: data.suggestedAction,
            timestamp: Date.now()
          }
        }
      }));
    } else {
      // Show standard error notification
      setError(data.error);
    }
  }
};
```

By implementing this comprehensive error handling strategy, the autosave feature will be robust enough to handle edge cases while providing users with clear feedback and recovery options when things go wrong.
