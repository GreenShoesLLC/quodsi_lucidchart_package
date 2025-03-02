# Data Connector Actions

This directory contains action handlers for the Quodsi data connector. These actions facilitate communication between the LucidChart environment and the Quodsi simulation backend, enabling simulation execution, data import, data refreshing, and more.

## Purpose

Data connector actions serve as the API endpoints for the Quodsi extension. They:

1. Receive requests from the LucidChart extension
2. Process data and parameters 
3. Communicate with external services (such as the Quodsi simulation engine)
4. Return data to LucidChart
5. Update data collections in LucidChart documents

## Action Types

The data connector actions can be categorized into several types:

### Simulation Management

- `simulateAction.ts` - Triggers a simulation run via the Quodsi simulation engine
- `submitSimulationJobAction.ts` - Submits a simulation job to the processing queue
- `saveAndSubmitSimulationAction.ts` - Combines saving the model and submitting for simulation

### Data Import & Refresh

- `importSimulationResultsAction.ts` - Imports simulation results into LucidChart collections
- `hardRefreshAction.ts` - Reserved Lucid action that refreshes data when a document is reopened
- `pollAction.ts` - Reserved Lucid action that periodically updates data (every 30 seconds)

### Model Management

- `uploadModelDefinitionAction.ts` - Uploads model definition to the backend storage

### Data Access

- `getActivityUtilizationAction.ts` - Retrieves activity utilization data
- `patchAction.ts` - Reserved Lucid action that handles changes made to data in LucidChart

## Integration with LucidChart

When a user interacts with the Quodsi extension panel in LucidChart, the extension calls the `performDataAction` method to trigger specific actions. For example:

```typescript
await this.client.performDataAction({
    dataConnectorName: 'quodsi_data_connector',
    actionName: 'ImportSimulationResults',
    actionData: { documentId: docId, userId: userId, pageId: viewport.getCurrentPage()?.id },
    asynchronous: true
});
```

This request flows to the Azure Function `dataConnectorHttpTrigger`, which routes the request to the appropriate action based on the `actionName` parameter.

## Action Structure

Each action follows a similar pattern:

```typescript
export const someAction = async (action: DataConnectorAsynchronousAction) => {
    try {
        // Extract data from the action
        const data = action.data as { /* expected structure */ };
        
        // Perform necessary operations
        // ...
        
        // Update LucidChart data (if applicable)
        await action.client.update({
            dataSourceName: "...",
            collections: {
                // Collection updates
            }
        });
        
        return { success: true };
    } catch (error) {
        console.error("Error in action:", error);
        return { success: false };
    }
};
```

## Reserved vs. Custom Actions

The data connector includes both reserved and custom actions:

### Reserved Actions
- `hardRefreshAction.ts` - Called when a document is opened after being closed for an extended period
- `pollAction.ts` - Called every 30 seconds while a document is open
- `patchAction.ts` - Called when users make changes to data in LucidChart

### Custom Actions
All other actions are custom and must be explicitly called from the editor extension.

## Authentication and Authorization

Actions receive the user's OAuth token via `action.context.userCredential`, which can be used to authenticate requests to external services on behalf of the user.

## Usage

When implementing a new feature that requires communication between LucidChart and the Quodsi backend:

1. Create a new action file in this directory
2. Register the action in the data connector's index.ts file
3. Add the action to the dataActions mapping in the manifest.json file
4. Call the action from the editor extension using `performDataAction`

This framework allows for extending the functionality of the Quodsi extension with new capabilities while maintaining a clean separation between the LucidChart UI and the backend processing logic.