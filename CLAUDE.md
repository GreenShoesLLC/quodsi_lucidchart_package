# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quodsi is a LucidChart extension that transforms diagrams into discrete event simulation models. The project is structured as a monorepo with three main components that work together to provide a seamless simulation modeling experience. The simulation/data backend lives in a separate repository (`quodsi_api`) and is reached via the `quodsi_api_data_connector` defined in the manifests.

## Architecture

### Component Structure
1. **Shared Library** (`/shared`) - Core domain models, validation, serialization, and messaging protocol
2. **Editor Extension** (`/editorextensions/quodsi_editor_extension`) - TypeScript-based LucidChart extension that manages the model lifecycle
3. **React UI** (`/editorextensions/quodsi_editor_extension/quodsim-react`) - Embedded React app for model editing and simulation controls

### Key Architectural Patterns

#### Messaging System
The project uses a postMessage-based protocol for communication between the extension and React panels:
- **Envelope Structure**: Messages contain `id`, `type`, `source`, `target`, `version`, and `data`
- **MessageRouter**: Central singleton in the extension that manages all message routing
- **MessageProvider**: React component that handles all postMessage traffic
- **Type Guards**: Always validate messages before processing

#### State Management
- Extension maintains authoritative state in ModelManager
- React panels maintain local state via reducers
- Synchronization happens through message passing
- Selection changes are broadcast to all interested components

## Development Commands

### Initial Setup
```bash
# Install dependencies for all workspaces
npm install

# Build shared library first (required by other components)
cd shared && npm run build
```

### Local Development
```bash
# Start the extension in test mode (from root)
npm start

# Start React app development server (with hot reload)
cd editorextensions/quodsi_editor_extension/quodsim-react && npm start
```

### Building
```bash
# Build shared library
cd shared && npm run build

# Build React app for production
cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build

# Bundle extension for deployment (from root)
npm run bundle
```

### Testing
```bash
# Run shared library tests
cd shared && npm test

# Update test snapshots
cd shared && npm run test:update-snapshots

# Run React app tests
cd editorextensions/quodsi_editor_extension/quodsim-react && npm test
```

### Running Individual Tests
```bash
# Run a specific test file
cd shared && npm test -- ModelValidationService.test.ts

# Run tests in watch mode
cd shared && npm test -- --watch
```

## Important Development Notes

### Current Refactoring
The project is undergoing a messaging system refactoring on the `feature/refactoring_messaging` branch:
- Moving from tightly-coupled messaging to centralized ExtensionMessaging service
- Implementing type-safe message handling
- Creating clear separation between UI and messaging logic

### Message Flow
1. React → Extension: Use typed message builders from `quodsi-messaging`
2. Extension → React: Route through MessageRouter
3. Always handle REACT_APP_READY before sending messages to panels

### Common Gotchas
1. **Build Order**: Always build shared library before other components
2. **Race Conditions**: Messages are queued until REACT_APP_READY is received
3. **Authentication**: Auth state must be synchronized across all panels
4. **Validation**: Model validation happens in shared library, not in UI
5. **Type Safety**: Use shared types from `@quodsi/shared` package

### Environment Configuration
- **Local**: `http://localhost:7071/api/dataConnector/`
- **Dev**: `https://dev-quodsi-func-v1.azurewebsites.net/api/dataConnector/`
- **Test**: `https://tst-quodsi-func-v1.azurewebsites.net/api/dataConnector/`
- **Production**: `https://prd-quodsi-func-v1.azurewebsites.net/api/dataConnector/`

### Key Classes and Services
- `ModelManager`: Central coordinator for model state and operations
- `StorageAdapter`: Handles persistence to LucidChart storage
- `MessageRouter`: Routes messages between extension and panels
- `ModelDefinition`: Core domain model containing all simulation objects
- `ModelValidationService`: Validates model correctness before simulation

### Debugging Tips
1. Enable console logging in browser developer tools
2. Use the test extension mode (`npm start`) for faster iteration
3. Check the Network tab for data connector API calls
4. Validation messages appear in the React UI's validation panel
5. Use browser's postMessage debugging to trace message flow

## Azure Integration

### Required Azure Resources
- Azure Functions for data connector
- Azure Batch for simulation execution
- Azure Storage for model and results storage
- User authentication via Kinde (integrated through Lucid's platform OAuth; see `_docs/auth-migration-to-kinde.md` for architecture)

### Local Azure Development
1. Copy `local.settings.json.template` to `local.settings.json` in data connector
2. Configure Azure Storage connection strings
3. Install Azure Functions Core Tools
4. Run `npm start` in data connector directory

## Lucid SDK Integration

### Key SDK Concepts Used
- **EditorClient**: Main interface for document interaction
- **BlockProxy/LineProxy**: Shape and connector representation
- **Panel API**: For creating UI panels
- **Collection API**: For managing simulation data
- **Data Connector API**: For external data sync

### SDK Documentation
- Official docs: https://developer.lucid.co/docs/
- Local reference: `LUCID_SDK_REFERENCE.md`
- SDK examples in: `_docs/sdk/`

### Common SDK Patterns
1. Always wait for panel ready state before messaging
2. Use collection API for large datasets (simulation results)
3. Store complex data as JSON strings in shape data
4. Handle async operations with proper error handling

## Deployment

The project separates **infrastructure provisioning** (rare) from **application deployment** (frequent):

### Infrastructure Provisioning (`/infrastructure/`)
Infrastructure as Code (ARM templates) for creating Azure resources:
- **Batch**: `/infrastructure/batch/v1/` - Batch account and environment pools
- **Function Apps**: `/infrastructure/function-apps/v1/` - Function App infrastructure
- **Storage**: `/infrastructure/storage/v1/` - Storage accounts
- **Shared Scripts**: `/infrastructure/scripts/` - ARM deployment utilities

Provision infrastructure rarely, only when creating new environments or modifying resources.

### Application Deployment (`/deploy/`)
Scripts for deploying code to existing infrastructure:

#### Function App Code Deployment
```bash
# Quick deployment (uses convenience wrapper)
./deploy/deploy-function.bat dev

# Or use PowerShell directly with options
./deploy/azure-functions/deploy-function-code.ps1 -Environment dev -Force
```

#### Lucid Extension Package
```bash
# Build and bundle for specific environment
./deploy/lucid-package/build-bundle.ps1 -TargetEnvironment PRD

# Then upload package.zip to LucidChart developer portal
```

#### React App (optional standalone build)
```bash
# Usually bundled automatically by Lucid package build
./deploy/react/build-react.ps1 -TargetEnvironment Dev
```

### Deployment Frequency
- **Infrastructure**: Rarely (new environments or resource changes)
- **Function Code**: Frequently (on backend changes)
- **Lucid Extension**: Frequently (on extension/UI changes)