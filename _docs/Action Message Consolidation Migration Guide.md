# Action Message Consolidation Migration Guide

This guide outlines the migration process for transitioning to the consolidated action message approach, which reduces the number of message types and creates a more consistent messaging architecture.

## Overview

We're consolidating several individual message types into a unified action-based messaging system with two primary message types:

1. `ACTION_REQUEST` - For requesting actions to be performed
2. `ACTION_RESPONSE` - For responses to those actions, including success/failure status and results

## Migration Strategy

The migration will be done incrementally in phases:

1. Add new message structures without removing existing ones
2. Implement handlers for the new message types alongside existing ones
3. Migrate one message type at a time to the new approach
4. Once all types are migrated, remove the legacy message types

## New Files Added

1. `ActionPayloads.ts` - Contains the `ActionType` enum and payload structures
2. `ActionMessageTypes.ts` - Contains the new consolidated message types
3. `actionMessageHandlers.ts` - Handlers for action messages in the React app
4. `ActionMessageHandler.ts` - Handler for action messages in the extension

## Migration Process

### Phase 1: Setup and Infrastructure

✅ Create new message type definitions and handlers  
✅ Wire up basic handler registration

### Phase 2: Message-by-Message Migration

For each message type to be migrated:

1. Update React components to send the new message format
2. Ensure the handler for the new format is fully implemented
3. Test the new implementation alongside the old one
4. Once confirmed working, remove references to the old message type

### Migration Order Recommendation

Migrate messages in this order:

1. `VALIDATE_MODEL` → `ACTION_REQUEST` with `ActionType.VALIDATE_MODEL`
2. `SIMULATE_MODEL` → `ACTION_REQUEST` with `ActionType.SIMULATE_MODEL`
3. `VIEW_SIMULATION_RESULTS` → `ACTION_REQUEST` with `ActionType.VIEW_SIMULATION_RESULTS`
4. Other simulation-related messages
5. Model and element operations
6. Error handling

## Message Type Mapping

| Old Message Type | New ActionType |
|------------------|----------------|
| `CONVERT_PAGE` | `ActionType.CONVERT_PAGE` |
| `UPDATE_ELEMENT_DATA` | `ActionType.UPDATE_ELEMENT_DATA` |
| `CONVERT_ELEMENT` | `ActionType.CONVERT_ELEMENT` |
| `REMOVE_MODEL` | `ActionType.REMOVE_MODEL` |
| `SIMULATE_MODEL` | `ActionType.SIMULATE_MODEL` |
| `VALIDATE_MODEL` | `ActionType.VALIDATE_MODEL` |
| `SIMULATION_STATUS_CHECK` | `ActionType.SIMULATION_STATUS_CHECK` |
| `OUTPUT_CREATE_PAGE` | `ActionType.CREATE_RESULTS_PAGE` |
| `VIEW_SIMULATION_RESULTS` | `ActionType.VIEW_SIMULATION_RESULTS` |
| `MARK_RESULTS_VIEWED` | `ActionType.MARK_RESULTS_VIEWED` |

## Response Mapping

| Old Response Message | New Response Action Type |
|----------------------|--------------------------|
| `SIMULATION_STARTED` | `ActionType.SIMULATE_MODEL` response |
| `SIMULATION_STATUS_UPDATE` | `ActionType.SIMULATION_STATUS_CHECK` response |
| `MODEL_REMOVED` | `ActionType.REMOVE_MODEL` response |
| `VALIDATION_RESULT` | `ActionType.VALIDATE_MODEL` response |
| `SIMULATION_RESULTS_ACKNOWLEDGED` | `ActionType.MARK_RESULTS_VIEWED` response |
| `UPDATE_SUCCESS` | `ActionType.UPDATE_ELEMENT_DATA` response |

## Example Migration for VALIDATE_MODEL

### Before:

```typescript
// Sending the message
messaging.sendMessage(MessageTypes.VALIDATE_MODEL);

// Handling the message in ModelPanel.ts
this.messaging.onMessage(MessageTypes.VALIDATE_MODEL, () => this.handleValidateModel());

// Handler implementation
private async handleValidateModel(): Promise<void> {
    const validationResult = await this.modelManager.validateModel();
    this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
}

// React component handling the response
this.messaging.onMessage(MessageTypes.VALIDATION_RESULT, (payload) => {
    setState(prev => ({
        ...prev,
        validationResult: payload
    }));
});
```

### After:

```typescript
// Sending the message
messaging.sendMessage(ActionMessageTypes.ACTION_REQUEST, {
    actionType: ActionType.VALIDATE_MODEL
});

// Handling the message in ActionMessageHandler.ts
// Already implemented in the ActionMessageHandler class

// React component handling the response
this.messaging.onMessage(ActionMessageTypes.ACTION_RESPONSE, (payload) => {
    if (payload.actionType === ActionType.VALIDATE_MODEL && payload.success) {
        setState(prev => ({
            ...prev,
            validationResult: payload.data.validationResult
        }));
    }
});
```

## Testing Strategy

For each migrated message type:

1. Create a test scenario that exercises the functionality
2. Verify that the action is performed correctly
3. Verify that the response is received and processed correctly
4. Check that the UI updates appropriately

## Final Cleanup

Once all message types have been migrated:

1. Update the main `MessageTypes.ts` to remove the deprecated message types
2. Remove legacy handlers and code
3. Remove the temporary `ActionMessageTypes.ts` file and merge it into the main type file
4. Update any remaining documentation or comments