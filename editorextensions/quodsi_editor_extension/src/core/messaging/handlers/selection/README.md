# Selection Handling System

This module implements a modular selection handling system for the Quodsi LucidChart extension. It processes selection events from the LucidChart editor and transforms them into messages for the React application.

## Architecture

The selection system follows a modular design with Command pattern elements:

```
                 ┌──────────────────┐
                 │                  │
Extension.ts ───►│  SelectionHandler│◄───── MessageRouter
                 │  (Coordinator)   │
                 │                  │
                 └────────┬─────────┘
                          │
    ┌───────────────┬─────┼─────┬───────────────┐
    │               │           │               │
    ▼               ▼           ▼               ▼
┌──────────┐   ┌─────────┐  ┌──────────┐   ┌──────────┐
│          │   │         │  │          │   │          │
│ Selection│   │ Document│  │ Processor│   │ Utility  │
│  State   │   │ Context │  │ Factory  │   │ Functions│
│          │   │         │  │          │   │          │
└──────────┘   └─────────┘  └────┬─────┘   └──────────┘
                                 │
                           ┌─────┴─────┐
                           │           │
                      ┌────▼─┐    ┌────▼─┐
                      │      │    │      │
                      │Proc 1│    │Proc 2│ ...
                      │      │    │      │
                      └──────┘    └──────┘
```

## Key Components

### 1. SelectionHandler

The main entry point and coordinator for the selection system. Responsibilities:

- Receives selection events from LucidChart
- Coordinates between state managers and processors
- Sends messages to the React application via router

### 2. State Management

- **SelectionState**: Manages selection-related state
- **DocumentContext**: Manages document and page context information

### 3. Processors

Specialized classes for handling different selection types:

- **BaseSelectionProcessor**: Abstract base class with common functionality
- **NoneSelectionProcessor**: Handles no selection state (page level)
- **MultipleSelectionProcessor**: Handles multiple item selection
- **ActivityProcessor**: Handles activity selection
- **ConnectorProcessor**: Handles connector selection
- **EntityProcessor**: Handles entity selection
- **ResourceProcessor**: Handles resource selection
- **GeneratorProcessor**: Handles generator selection
- **ModelProcessor**: Handles model selection
- **UnconvertedProcessor**: Handles unconverted element selection

### 4. ProcessorFactory

Creates the appropriate processor for each selection type, following the Factory pattern.

### 5. Utility Functions

Specialized utilities for common tasks:

- **selectionTypeUtils**: Determines selection types and creates element shapes
- **itemDataBuilder**: Builds model item data objects
- **referenceDataBuilder**: Builds reference data for entities and resources

## Message Flow

1. LucidChart selection event is triggered
2. `SelectionHandler.handleLucidSelectionEvent()` receives the event
3. SelectionHandler gets context info and determines selection type
4. ProcessorFactory creates the appropriate processor
5. The processor processes the selection and builds message data
6. SelectionState is updated with the new data
7. SelectionHandler sends a message to React via the router

## Usage

### Hook Selection Events

```typescript
// In extension.ts
import { SelectionHandler } from './core/messaging/handlers/selection';

// Initialize the SelectionHandler with model manager
SelectionHandler.setModelManager(modelManager);

// Hook selection changes to SelectionHandler
viewport.hookSelection((items) => {
    SelectionHandler.handleLucidSelectionEvent(client, items);
});
```

### Add a New Processor

To add support for a new selection type:

1. Create a new processor class that extends BaseSelectionProcessor
2. Register it with the ProcessorFactory
3. No changes to SelectionHandler are needed

```typescript
// Create a new processor
export class EntityProcessor extends BaseSelectionProcessor {
  async process(
    client: EditorClient,
    currentPage: ElementProxy,
    items: ItemProxy[],
    selectionType: SelectionType,
    modelManager: ModelManager
  ): Promise<Partial<SelectionStateData>> {
    // Implement entity processing logic
  }
}

// Register the processor
ProcessorFactory.registerProcessor(SelectionType.ENTITY, new EntityProcessor());
```

## Extending the System

This modular architecture makes it easy to extend the selection system:

1. **Add a new selection type**: Create a new processor and register it
2. **Add new data fields**: Update the `SelectionStateData` interface
3. **Add new reference data**: Extend the `referenceDataBuilder` utilities
4. **Add new model item data**: Extend the `itemDataBuilder` utilities

## Benefits

- **Single Responsibility**: Each class has a focused purpose
- **Open/Closed**: Easy to add new selection types without modifying existing code
- **Testability**: Each component can be tested independently
- **Maintainability**: Small, focused files are easier to maintain
- **Scalability**: Architecture supports adding complex behaviors for new selection types
- **Flexibility**: Easy to adapt to changing requirements

## Compatibility with Previous System

This new selection system is designed to be compatible with the previous system's message format, ensuring that existing React components continue to work without changes. The `SelectionHandler` class maintains backward compatibility with the old `selectionHandler.ts` API.

## Migration Path

To migrate from the old selection system:

1. All code has been updated to use the new `SelectionHandler` from `./selection`
2. The old `selectionHandler.ts` file now forwards calls to the new implementation
3. No changes are needed in the React components

## Error Handling

The selection system includes robust error handling:

- Each processor handles its own errors and returns appropriate error information
- The `SelectionHandler` catches and logs all errors during processing
- Error messages are sent to React to show appropriate UI feedback
- Selection processing is protected against concurrent modifications

## Performance Considerations

The modular design improves performance:

- Only the necessary processor is loaded for each selection type
- Utility functions are optimized for minimal overhead
- Selection state updates are batched before sending to React
- Unnecessary processing is avoided based on document context

## Logging and Debugging

The selection system includes extensive logging for debugging:

- All key operations are logged with contextual information
- State changes are logged for easy tracking
- Errors are logged with full stack traces when available
- Performance bottlenecks are identified and logged
