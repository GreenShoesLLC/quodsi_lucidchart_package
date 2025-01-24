# User Story: Add Message Exchange Tracking in ModelPanel

## Description
As a developer, I want to track complete message exchanges between React and Panel, ensuring proper handling of operations and providing better control over response timing and validation messaging.

## Current Behavior
- No formal tracking of message exchanges
- Difficult to correlate React requests with Panel responses
- Multiple responses possible for single request
- Validation state can be sent multiple times

## Desired Behavior
- Each React->Panel request starts a tracked exchange
- Panel operations within exchange are monitored
- Single, consolidated response sent back to React
- Clear lifecycle for message processing

## Technical Changes Required

### 1. Message Exchange Types
```typescript
// In ModelPanel.ts
interface MessageExchange {
    id: string;
    initiatingMessageType: MessageTypes;
    startTime: number;
    pendingOperations: number;
    hasResponded: boolean;
}

enum ExchangeState {
    PENDING,
    COMPLETED,
    ERROR
}

interface ExchangeMetrics {
    duration: number;
    operationsExecuted: number;
    messageType: MessageTypes;
}
```

### 2. ModelPanel Exchange Tracking
```typescript
export class ModelPanel extends Panel {
    private currentExchange: MessageExchange | null = null;
    private exchangeMetrics: ExchangeMetrics[] = [];

    private beginMessageExchange(messageType: MessageTypes): void {
        this.currentExchange = {
            id: crypto.randomUUID(),
            initiatingMessageType: messageType,
            startTime: Date.now(),
            pendingOperations: 0,
            hasResponded: false
        };
        this.log('Beginning message exchange:', this.currentExchange);
    }

    private endMessageExchange(): void {
        if (!this.currentExchange) return;

        const metrics: ExchangeMetrics = {
            duration: Date.now() - this.currentExchange.startTime,
            operationsExecuted: this.currentExchange.pendingOperations,
            messageType: this.currentExchange.initiatingMessageType
        };
        this.exchangeMetrics.push(metrics);
        this.currentExchange = null;
    }

    protected messageFromFrame(message: any): void {
        if (!isValidMessage(message)) {
            this.logError('Invalid message format:', message);
            return;
        }

        this.beginMessageExchange(message.messagetype);
        try {
            this.messaging.handleIncomingMessage(message);
        } finally {
            this.endMessageExchange();
        }
    }

    private async withExchangeTracking<T>(
        operation: () => Promise<T>
    ): Promise<T> {
        if (!this.currentExchange) {
            throw new Error('No active message exchange');
        }

        this.currentExchange.pendingOperations++;
        try {
            return await operation();
        } finally {
            this.currentExchange.pendingOperations--;
        }
    }
}
```

### 3. Operation Handling with Exchange Tracking
```typescript
private async handleUpdateElementData(
    updateData: MessagePayloads[MessageTypes.UPDATE_ELEMENT_DATA]
): Promise<void> {
    await this.withExchangeTracking(async () => {
        try {
            await this.modelManager.saveElementData(...);
            const validationResult = await this.modelManager.validateModel();
            
            if (!this.currentExchange?.hasResponded) {
                this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                    elementId: updateData.elementId,
                    validationResult
                });
                this.currentExchange.hasResponded = true;
            }
        } catch (error) {
            this.handleError('Error updating element:', error);
        }
    });
}
```

## Success Criteria
1. Each React->Panel interaction is tracked as an exchange
2. Panel operations are counted and monitored
3. Only one response sent per exchange
4. Error handling maintains exchange state
5. Metrics available for performance monitoring

## Implementation Approach
1. Add exchange tracking infrastructure
2. Update message handling to use exchange context
3. Modify operation handlers to track pending operations
4. Add metrics collection
5. Implement safeguards for response handling

## Risks and Mitigation
- **Risk**: Lost responses due to exchange tracking
  - **Mitigation**: Add timeout recovery mechanism
- **Risk**: Added complexity in message flow
  - **Mitigation**: Comprehensive logging and monitoring
- **Risk**: Race conditions in async operations
  - **Mitigation**: Careful state management and testing

## Testing Criteria
- [ ] Exchange created for each React message
- [ ] Operations properly tracked within exchange
- [ ] Single response per exchange verified
- [ ] Error cases maintain exchange integrity
- [ ] Metrics collected and accurate
- [ ] Performance impact minimal
- [ ] Exchange cleanup reliable

## Monitoring and Metrics
- Exchange duration
- Operations per exchange
- Response timing
- Error rates by message type
- Exchange completion status