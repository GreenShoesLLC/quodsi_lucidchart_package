# User Story: Include Validation Results in Base Response Payloads

## Description
As a developer, I want validation results to be included in all response payloads from the Panel to React, eliminating the need for separate validation messages and reducing duplicate validation states in the UI.

## Current Behavior
- Validation results are sent as separate `VALIDATION_RESULT` messages
- React app receives validation state through multiple channels
- Multiple state updates can cause duplicate validation messages in UI

## Desired Behavior
- All Panel->React messages include current validation state
- No separate validation messages needed
- React maintains single source of truth for validation state
- Validation results are consistent across UI

## Technical Changes Required

### 1. Base Response Type
```typescript
// In @quodsi/shared
interface BaseResponsePayload {
    validationResult: ValidationResult;
}

// Update all response payloads to extend base
interface UpdateSuccessPayload extends BaseResponsePayload {
    elementId: string;
}

interface ErrorPayload extends BaseResponsePayload {
    error: string;
}

interface SelectionChangedPayload extends BaseResponsePayload {
    selectionState: SelectionState;
    modelStructure: ModelStructure;
    expandedNodes: string[];
}
```

### 2. ModelPanel Changes
```typescript
// Remove standalone validation message handler
protected messageFromFrame(message: any): void {
    if (!isValidMessage(message)) {
        const validationResult = await this.modelManager.validateModel();
        this.sendTypedMessage(MessageTypes.ERROR, {
            error: 'Invalid message format',
            validationResult
        });
        return;
    }
    // ...
}

// Include validation in all responses
private async handleUpdateElementData(
    updateData: MessagePayloads[MessageTypes.UPDATE_ELEMENT_DATA]
): Promise<void> {
    try {
        await this.modelManager.saveElementData(...);
        const validationResult = await this.modelManager.validateModel();
        
        this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
            elementId: updateData.elementId,
            validationResult
        });
    } catch (error) {
        const validationResult = await this.modelManager.validateModel();
        this.sendTypedMessage(MessageTypes.ERROR, {
            error: `Failed to update element: ${error}`,
            validationResult
        });
    }
}
```

### 3. React Changes
```typescript
// Remove VALIDATION_RESULT message handler
const messageHandlers = {
    // Remove this handler
    [MessageTypes.VALIDATION_RESULT]: (data, { setState }) => {...}
}

// Update other handlers to use validation from payload
[MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL]: (data, { setState }) => {
    setState(prev => ({
        ...prev,
        validationState: data.validationResult,
        // ... other state updates
    }));
}
```

## Success Criteria
1. `VALIDATION_RESULT` message type and handler are removed
2. All Panel->React messages include validation results
3. No duplicate validation messages appear in UI
4. React components show consistent validation state
5. Performance is improved with fewer state updates

## Implementation Approach
1. Update shared types package with new base payload type
2. Update Panel message sending to include validation
3. Remove VALIDATION_RESULT handling
4. Update React state management
5. Test all message flows to ensure validation consistency

## Risks and Mitigation
- **Risk**: Breaking existing validation handling
  - **Mitigation**: Phase implementation with feature flag
- **Risk**: Performance impact from validation in every payload
  - **Mitigation**: Cache validation results in ModelManager

## Testing Criteria
- [ ] All Panel responses include validation state
- [ ] UI shows correct validation state after each operation
- [ ] No duplicate validation messages
- [ ] Performance metrics show reduced re-renders
- [ ] Error cases properly include validation state