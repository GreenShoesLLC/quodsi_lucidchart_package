# Azure Requirements for Quodsi SSO Implementation

This document outlines the Azure resources, permissions, and configuration needed to implement Quodsi's Single Sign-On (SSO) solution with Azure AD B2C and subscription management.

## Azure Subscription Requirements

### Subscription Type

To implement the Quodsi SSO solution, you need an Azure subscription with:

- Access to Azure AD B2C service
- Ability to create and manage Azure Functions
- Ability to create and manage Azure Storage accounts
- Access to Azure Key Vault service (for secure secret management)

Any of the following subscription types will work:
- Pay-As-You-Go
- Enterprise Agreement
- Microsoft Azure Sponsorship
- Visual Studio subscription

> **Note:** Free trial subscriptions may have limitations that prevent full implementation.

### Resource Quotas

Ensure your Azure subscription has sufficient quotas for:

- At least 10 Azure Functions
- Minimum of 3 Storage accounts
- Azure AD B2C tenant creation
- Outbound internet connectivity for Azure Functions

## Required Azure Services

| Service | Purpose | Minimum SKU |
|---------|---------|-------------|
| Azure AD B2C | Identity management | Basic tier |
| Azure Functions | Backend API and Webhook processing | Consumption plan (minimum), Premium plan (recommended) |
| Azure Storage | Data storage and session state | Standard LRS |
| Azure Key Vault | Secret management | Standard |
| Azure Redis Cache | Token and subscription caching | Basic C0 |
| Application Insights | Monitoring and diagnostics | Basic |

## Required Permissions

### Azure Subscription Permissions

The implementing user must have the following roles:

- Owner or Contributor on the Azure subscription
- Global Administrator in Azure AD
- User Access Administrator (for assigning roles)

### Azure AD B2C Permissions

To create and configure Azure AD B2C, you need:

- Global Administrator in Azure AD
- Subscription Owner or Contributor
- Permission to register applications in Azure AD

## Network Requirements

### Outbound Connectivity

Azure Functions need outbound connectivity to:

- Azure AD B2C tenant (authentication)
- Stripe API (subscription validation)
- LucidChart API (for integration features)

### IP and Domain Whitelisting

Ensure your network policies allow connections to:

- `*.b2clogin.com` (Azure AD B2C authentication)
- `*.stripe.com` (Stripe API and webhook endpoints)
- `*.lucid.app` and `*.lucid.co` (LucidChart domains)
- `*.azurewebsites.net` (Azure Functions)

## Estimated Costs

| Service | Tier | Estimated Monthly Cost |
|---------|------|------------------------|
| Azure AD B2C | Basic (10,000 authentications) | $25.00 |
| Azure Functions | Consumption Plan (1M executions) | $20.00 |
| Azure Storage | Standard LRS (50 GB) | $5.00 |
| Azure Key Vault | Standard (5,000 operations) | $3.00 |
| Azure Redis Cache | Basic C0 | $16.00 |
| Application Insights | Per GB data collection | $2.50 |
| **Total Estimated Cost** | | **$71.50** |

> **Note:** Actual costs may vary based on usage, region, and any existing Azure agreements.

## Azure Resource Naming Conventions

Use the following naming convention for Azure resources:

- **Resource Groups**: `rg-quodsi-{environment}-{region}`
- **Azure Functions**: `func-quodsi-{purpose}-{environment}-{region}`
- **Storage Accounts**: `stquodsi{purpose}{environment}`
- **Key Vault**: `kv-quodsi-{environment}-{region}`
- **B2C Tenant**: `quodsi-{environment}.onmicrosoft.com`

Where:
- `{environment}` is one of: `dev`, `test`, `stage`, `prod`
- `{region}` is the Azure region code, e.g., `eastus`, `westeu`
- `{purpose}` describes the specific use, e.g., `auth`, `api`, `webhook`

## Next Steps

1. Verify your Azure subscription meets the requirements listed above
2. Ensure you have the necessary permissions
3. Plan your Azure resource requirements based on expected scale
4. Proceed to [Azure AD B2C tenant setup](../02-azure_ad_b2c/tenant_setup.md)
