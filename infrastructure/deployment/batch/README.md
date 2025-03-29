# Azure Batch Deployment Templates

This directory contains templates for deploying and managing Azure Batch resources for the Quodsi LucidChart Package.

## Subdirectories

| Directory       | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| **v1/**         | Current production-ready templates using the shared Batch account approach |
| **deprecated/** | Previous templates and configuration files (for reference only)            |

## Current Deployment Strategy (v1)

The current deployment strategy uses a single shared Batch account with environment-specific pools:

1. **Shared Batch Account**: `quodsisharedbatch01` in resource group `shared-quodsi-rg-01`
2. **Environment-specific Pools**:
   - Development: `quodsi-dev-python-pool-01`
   - Testing: `quodsi-tst-python-pool-01`
   - Production: `quodsi-prd-python-pool-01`

This approach accommodates Azure's limitation of 1 Batch account per subscription while providing environment isolation.

## Getting Started

See the README.md file in the `v1` directory for detailed deployment instructions.

## Important Notes

1. **Cloud Service Configuration Retirement**: As of February 29, 2024, Cloud Service Configuration for Batch pools is retired. All new pool deployments use Virtual Machine Configuration.

2. **Batch Account Quota**: Azure subscriptions typically have a quota limit of 1 Batch account. This is why we use the shared Batch account approach.

3. **Cross-Resource Group Deployments**: The Batch account is deployed in a shared resource group, with cross-resource group references to storage accounts.

4. **Application Packages**: Application packages must be uploaded through the Azure Portal after the Batch account is created.

5. **Pool Scaling**: All pools are initially created with 0 nodes to prevent unnecessary costs before application packages are uploaded.
