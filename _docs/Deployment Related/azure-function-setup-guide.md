# Creating and Deploying an Azure Functions App with VS Code

This guide walks through setting up, developing, and deploying an Azure Functions application using Visual Studio Code, the Azure Functions extension, and PowerShell.

## Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/) installed
- [Node.js](https://nodejs.org/) LTS version installed (14.x or later)
- [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools#installing) version 4.x
- [Azure Functions Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions) for VS Code
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- Active Azure subscription

## Step 1: Create a New Project Directory

1. Open PowerShell terminal in VS Code
   
2. Create the project directory:

   ```powershell
   # Working directory: any location
   mkdir C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   cd C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   ```

## Step 2: Initialize the Azure Functions Project

1. Open the new directory in VS Code:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors
   code quodsi_data_connector_lucidchart_v1
   ```

2. Open the VS Code command palette (Ctrl+Shift+P) and type "Azure Functions: Create New Project"

3. Select the project directory:
   - Choose the current directory (`C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1`)

4. Select the language:
   - Choose **TypeScript**

5. Select the programming model:
   - Choose **Model V4 (Preview)** for the latest Azure Functions model

6. Select the runtime:
   - Choose **Node.js 18 LTS**

7. Choose how to open your project:
   - Select **Open in current window**

## Step 3: Configure TypeScript Settings

1. Create a tsconfig.json file:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   echo '{
     "compilerOptions": {
       "module": "commonjs",
       "target": "es6",
       "outDir": "dist",
       "rootDir": ".",
       "sourceMap": true,
       "strict": false
     }
   }' > tsconfig.json
   ```

## Step 4: Configure Package.json

1. Initialize the package.json (if not already created):

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   npm init -y
   ```

2. Edit the package.json to include the necessary scripts and dependencies:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   code package.json
   ```

3. Update package.json with the following content:

   ```json
   {
     "name": "quodsi_data_connector_lucidchart_v1",
     "version": "1.0.0",
     "description": "Quodsi Data Connector for LucidChart",
     "scripts": {
       "build": "tsc && copyfiles host.json package.json dist",
       "watch": "tsc -w",
       "clean": "rimraf dist",
       "prestart": "npm run clean && npm run build",
       "start": "func start",
       "test": "echo \"No tests yet...\"",
       "deploy": "npm run build && func azure functionapp publish YOUR_FUNCTION_APP_NAME"
     },
     "dependencies": {
       "@azure/functions": "^4.0.0"
     },
     "devDependencies": {
       "@types/node": "^18.x",
       "copyfiles": "^2.4.1",
       "rimraf": "^5.0.0",
       "typescript": "^4.9.5"
     },
     "main": "dist/src/index.js"
   }
   ```

4. Install dependencies:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   npm install
   ```

## Step 5: Create the Function App Structure

1. Create src directory and index.ts:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   mkdir src
   cd src
   ```

2. Create an index.ts file:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1\src
   echo 'import { app } from "@azure/functions";

   app.setup({
       enableHttpStream: true
   });
   
   // Import all your function files here
   import "./functions/httpTrigger";
   ' > index.ts
   ```

3. Create functions directory and a sample function:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1\src
   mkdir functions
   cd functions
   ```

4. Create a sample HTTP trigger function:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1\src\functions
   echo 'import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

   export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
       context.log(`Http function processed request for url "${request.url}"`);

       const name = request.query.get("name") || await request.text() || "world";

       return {
           status: 200,
           jsonBody: {
               message: `Hello, ${name}!`
           },
           headers: {
               "Content-Type": "application/json"
           }
       };
   }

   app.http("httpTrigger", {
       methods: ["GET", "POST"],
       authLevel: "anonymous",
       handler: httpTrigger
   });
   ' > httpTrigger.ts
   ```

5. Go back to the root directory and create host.json:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1\src\functions
   cd ../..
   echo '{
     "version": "2.0",
     "logging": {
       "applicationInsights": {
         "samplingSettings": {
           "isEnabled": true,
           "excludedTypes": "Request"
         }
       }
     },
     "extensionBundle": {
       "id": "Microsoft.Azure.Functions.ExtensionBundle",
       "version": "[4.*, 5.0.0)"
     }
   }' > host.json
   ```

6. Create local.settings.json for local development:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   echo '{
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AzureWebJobsStorage": "UseDevelopmentStorage=true"
     }
   }' > local.settings.json
   ```

7. Create .funcignore file:

   ```powershell
   # Working directory: C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1
   echo '*.js.map
   *.t