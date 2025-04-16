# Development Environment Setup for Quodsi SSO Implementation

This document provides step-by-step instructions for setting up the development environment needed to implement Quodsi's Single Sign-On (SSO) solution integrated with LucidChart and subscription management.

## Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 16.x or higher | Backend and frontend development |
| npm | 8.x or higher | Package management |
| Visual Studio Code | Latest | Code editing |
| Git | Latest | Source control |
| Azure CLI | Latest | Azure resource management |
| Stripe CLI | Latest | Stripe webhook testing |
| LucidChart CLI | Latest | LucidChart extension development |

## Environment Setup Instructions

### 1. Node.js and npm Installation

#### Windows
1. Download the installer from [Node.js website](https://nodejs.org/)
2. Run the installer and follow the prompts
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

#### macOS
1. Using Homebrew:
   ```bash
   brew install node
   ```
2. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### 2. Visual Studio Code Installation

1. Download Visual Studio Code from [code.visualstudio.com](https://code.visualstudio.com/)
2. Install recommended extensions:
   - ESLint
   - Azure Tools
   - React Extension Pack
   - REST Client
   - Live Share (for collaborative development)

### 3. Git Setup

1. Install Git from [git-scm.com](https://git-scm.com/)
2. Configure Git:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

### 4. Azure CLI Installation

#### Windows
1. Download and run the Azure CLI installer from [Microsoft's website](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-windows)

#### macOS
```bash
brew install azure-cli
```

#### Login to Azure
```bash
az login
```

### 5. Stripe CLI Installation

#### Windows
1. Download the latest Windows release from [Stripe CLI GitHub releases](https://github.com/stripe/stripe-cli/releases)
2. Add the executable to your PATH

#### macOS
```bash
brew install stripe/stripe-cli/stripe
```

#### Login to Stripe
```bash
stripe login
```

### 6. LucidChart CLI Installation

```bash
npm install -g lucid-package
```

## Project Setup

### 1. Clone the Quodsi Repositories

```bash
mkdir C:\_source\Greenshoes
cd C:\_source\Greenshoes

# Clone the repositories
git clone <quodsi_lucidchart_package_repo_url> quodsi_lucidchart_package
git clone <quodsi_react_repo_url> quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react
git clone <quodsi_data_connector_repo_url> quodsi_data_connector
git clone <quodsi_shared_repo_url> quodsi_shared
```

### 2. Install Dependencies for Each Project

```bash
# LucidChart Extension
cd quodsi_lucidchart_package/editorextensions/quodsi_editor_extension
npm install

# React App
cd quodsim-react
npm install

# Data Connector
cd ../../../../quodsi_data_connector
npm install

# Shared Library
cd ../quodsi_shared
npm install
```

## Local Development Configuration

### 1. Create Environment Configuration Files

#### React App (.env.development)
```
# React App .env.development
REACT_APP_API_BASE_URL=http://localhost:7071/api
REACT_APP_B2C_CLIENT_ID=your_b2c_client_id
REACT_APP_B2C_TENANT=your_b2c_tenant.onmicrosoft.com
REACT_APP_B2C_POLICY=B2C_1_SUSI
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

#### Data Connector (local.settings.json)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "B2C_TENANT": "your_b2c_tenant.onmicrosoft.com",
    "B2C_CLIENT_ID": "your_b2c_client_id",
    "B2C_POLICY": "B2C_1_SUSI",
    "STRIPE_SECRET_KEY": "your_stripe_secret_key",
    "STRIPE_WEBHOOK_SECRET": "your_stripe_webhook_secret",
    "REDIS_CONNECTION_STRING": "localhost:6379"
  },
  "Host": {
    "CORS": "http://localhost:3000,https://lucid.app",
    "CORSCredentials": true
  }
}
```

### 2. Set Up Local Azure Storage Emulator

1. Install Azure Storage Emulator:
   - Windows: download from [Microsoft website](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-emulator)
   - macOS/Linux: use Azurite:
     ```bash
     npm install -g azurite
     ```

2. Start the emulator:
   - Windows: Start the storage emulator from the Start menu
   - macOS/Linux:
     ```bash
     azurite --silent --location path/to/data --debug path/to/debug.log
     ```

### 3. Set Up Local Redis Cache (for Token and Subscription Caching)

#### Windows
1. Download Redis for Windows using [MemoryDB](https://github.com/microsoftarchive/redis/releases)
2. Install and start the Redis server

#### macOS
```bash
brew install redis
brew services start redis
```

### 4. Stripe Webhook Local Testing

```bash
stripe listen --forward-to http://localhost:7071/api/stripe-webhook
```

## Running the Projects Locally

### 1. Start the Azure Functions Backend

```bash
cd quodsi_data_connector
npm run start
```

### 2. Start the React Development Server

```bash
cd quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react
npm start
```

### 3. Test the LucidChart Extension

```bash
cd quodsi_lucidchart_package
npx lucid-package@latest test-editor-extension quodsi_editor_extension
```

### 4. Access Development Environment

1. Open your browser and navigate to LucidChart
2. The extension should appear in the Extensions menu in LucidChart
3. Access the React app directly at http://localhost:3000 for standalone testing

## Setup Verification

### 1. Azure AD B2C Verification

1. Create a test user in your B2C tenant
2. Attempt to sign in using the React app
3. Verify token acquisition and inspect the token content

### 2. Stripe Integration Verification

1. Create a test subscription in Stripe
2. Verify webhook delivery using Stripe CLI
3. Confirm subscription validation in the backend API

### 3. LucidChart Integration Verification

1. Ensure the Panel loads correctly in LucidChart
2. Verify cross-domain messaging works
3. Test authentication flow within the Panel iframe

## Troubleshooting Common Issues

### Azure Functions Connectivity

If you encounter CORS issues:
- Check local.settings.json CORS configuration
- Ensure origins match exactly (including http/https)
- Verify CORSCredentials is set to true

### Authentication Flow Issues

If authentication fails:
- Check browser console for errors
- Verify redirect URIs are correctly configured in B2C
- Ensure popup authentication is properly implemented for iframe environment

### Stripe Webhook Issues

If webhooks aren't being received:
- Verify Stripe CLI is running and forwarding correctly
- Check the webhook signature verification
- Ensure the endpoint is publicly accessible (or use Stripe CLI forwarding)

## Next Steps

After setting up your development environment:

1. Proceed to [Azure AD B2C tenant setup](../02-azure_ad_b2c/tenant_setup.md)
2. Configure your [Stripe integration](../03-stripe_integration/stripe_setup.md)
3. Implement the authentication flow in the [React application](../04-react_implementation/msal_integration.md)
