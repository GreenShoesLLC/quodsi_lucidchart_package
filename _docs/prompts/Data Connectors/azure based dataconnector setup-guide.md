# Setting Up Quodsi Azure Data Connector

This guide outlines the steps to create an Azure Functions-based version of the Quodsi data connector.

## Prerequisites

1. Node.js LTS version (20.x) installed via nvm-windows
2. Azure Functions Core Tools v4
3. VS Code with Azure Functions extension
4. PowerShell execution policy set to RemoteSigned

## Project Setup

### 1. Create Base Project Structure

```powershell
# Create project directory
cd C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors
mkdir quodsi_azure_data_connector
cd quodsi_azure_data_connector

# Initialize Azure Functions project with TypeScript
func init --typescript

# Create necessary directories
mkdir src/collections
mkdir src/utils
```

### 2. Configure Package Dependencies

Replace the contents of `package.json` with:

```json
{
  "name": "@quodsi/azure-data-connector",
  "version": "1.0.0",
  "private": true,
  "devDependencies": {
    "@azure/functions": "^4.0.0",
    "@types/node": "^20.11.1",
    "@types/papaparse": "^5.3.15",
    "prettier": "^3.2.5",
    "typescript": "^5.1.6"
  },
  "dependencies": {
    "@quodsi/shared": "file:../../shared",
    "axios": "^1.7.9",
    "lucid-extension-sdk": "^0.0.263",
    "papaparse": "^5.5.2"
  },
  "main": "dist/src/functions/*.js",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "clean": "rimraf dist",
    "prestart": "npm run clean && npm run build",
    "start": "func start",
    "test": "jest"
  }
}
```

### 3. Create Azure Functions

Create the following function files in `src/functions/`:

1. `simulateAction.ts`
2. `getActivityUtilizationAction.ts`
3. `importSimulationResultsAction.ts`
4. `pollAction.ts`
5. `patchAction.ts`
6. `hardRefreshAction.ts`

### 4. Shared Code Structure

Create a shared utilities file at `src/utils/dataConnectorUtils.ts`:

```typescript
import { DataConnector, DataConnectorClient } from 'lucid-extension-sdk';
import * as crypto from 'crypto';

export const createDataConnector = () => {
    const client = new DataConnectorClient({ crypto, Buffer });
    return new DataConnector(client);
};

export const validateLucidRequest = async (headers: any, body: any) => {
    // Implement Lucid request validation logic
};
```

### 5. Function Implementation Pattern

Each function should follow this pattern (example for ImportSimulationResults):

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createDataConnector, validateLucidRequest } from '../utils/dataConnectorUtils';
import { importSimulationResultsAction } from '../actions/importSimulationResultsAction';

export async function importSimulationResults(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Validate request from Lucid
        await validateLucidRequest(request.headers, await request.json());
        
        // Create data connector instance
        const dataConnector = createDataConnector();
        
        // Execute action
        const result = await dataConnector.runAction(
            request.url,
            request.headers,
            await request.json()
        );

        return { 
            status: 200,
            jsonBody: result
        };
    } catch (error) {
        context.error('Error in importSimulationResults:', error);
        return {
            status: 500,
            body: error.message
        };
    }
}

app.http('importSimulationResults', {
    methods: ['POST'],
    authLevel: 'function',
    handler: importSimulationResults
});
```

### 6. Collections Setup

Copy the collection schema definitions from the original project to `src/collections/`:
- Copy all schema files
- Update imports to reflect new file structure

### 7. Environment Configuration

Create `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WEBSITE_NODE_DEFAULT_VERSION": "~20"
  }
}
```

### 8. Update Lucid Manifest

Update the `manifest.json` in the parent project to point to your Azure Functions endpoints:

```json
{
  "dataConnectors": [
    {
      "name": "quodsi_data_connector",
      "oauthProviderName": "lucid",
      "callbackBaseUrl": "https://your-azure-function-url/api/",
      "dataActions": {
        "Simulate": "simulate",
        "GetActivityUtilization": "getActivityUtilization",
        "ImportSimulationResults": "importSimulationResults",
        "Poll": "poll",
        "Patch": "patch",
        "HardRefresh": "hardRefresh"
      }
    }
  ]
}
```

## Development Workflow

1. Start local development:
```powershell
npm start
```

2. Test endpoints locally using Postman or curl:
```
http://localhost:7071/api/importSimulationResults
```

3. Debug using VS Code's Azure Functions extension

## Deployment

1. Create Azure Function App in Azure Portal
2. Deploy using VS Code Azure Functions extension:
   - Right-click on project
   - Select "Deploy to Function App..."
   - Follow deployment wizard

## Important Notes

1. Each function handles one specific action from the original data connector
2. Authentication is handled via function keys
3. Request validation ensures requests come from Lucid
4. Local development uses `local.settings.json`
5. Production deployment uses Azure App Settings
6. CORS must be configured in Azure for Lucid domains

## Testing

Test each endpoint to ensure:
1. Request validation works
2. Actions execute correctly
3. Responses match original data connector
4. Error handling works as expected

