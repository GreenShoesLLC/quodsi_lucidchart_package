<#
.SYNOPSIS
Deploys Azure Functions and builds the Lucid package in one operation.

.DESCRIPTION
This script orchestrates a full deployment by:
1. Deploying the Azure Function code to the specified environment
2. Building the Lucid extension package for the same environment

.PARAMETER Environment
Target environment: Dev, TST, or PRD

.PARAMETER Force
Skip confirmation prompts for Azure deployment

.PARAMETER SkipAzureDeploy
Skip the Azure Function deployment step

.PARAMETER SkipLucidBuild
Skip the Lucid package build step

.EXAMPLE
.\deploy-all.ps1 -Environment Dev

.EXAMPLE
.\deploy-all.ps1 -Environment PRD -Force
#>
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('Dev', 'TST', 'PRD')]
    [string]$Environment,

    [switch]$Force,
    [switch]$SkipAzureDeploy,
    [switch]$SkipLucidBuild
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$deployDir = (Get-Item $scriptDir).Parent.FullName

# Map environment to Azure script format (lowercase)
$azureEnv = $Environment.ToLower()
if ($azureEnv -eq "tst") { $azureEnv = "tst" }  # Already correct

# Script paths
$azureDeployScript = Join-Path $deployDir "azure-functions\deploy-function-code.ps1"
$lucidBuildScript = Join-Path $deployDir "lucid-package\build-bundle.ps1"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Quodsi Full Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment"
Write-Host "Azure Deploy: $(if ($SkipAzureDeploy) { 'SKIP' } else { 'YES' })"
Write-Host "Lucid Build:  $(if ($SkipLucidBuild) { 'SKIP' } else { 'YES' })"
Write-Host ""

# Step 1: Deploy Azure Functions
if (-not $SkipAzureDeploy) {
    Write-Host "================================================" -ForegroundColor Magenta
    Write-Host "Step 1: Deploying Azure Functions ($azureEnv)" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor Magenta

    $azureParams = @{
        Environment = $azureEnv
    }
    if ($Force) { $azureParams.Force = $true }

    & $azureDeployScript @azureParams

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Azure Function deployment failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    Write-Host "Azure Function deployment completed." -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping Azure Function deployment." -ForegroundColor Yellow
}

# Step 2: Build Lucid Package
if (-not $SkipLucidBuild) {
    Write-Host "================================================" -ForegroundColor Magenta
    Write-Host "Step 2: Building Lucid Package ($Environment)" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor Magenta

    & $lucidBuildScript -TargetEnvironment $Environment

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Lucid package build failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    Write-Host "Lucid package build completed." -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping Lucid package build." -ForegroundColor Yellow
}

# Summary
Write-Host "================================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Environment: $Environment"
if (-not $SkipAzureDeploy) {
    Write-Host "- Azure Functions deployed"
}
if (-not $SkipLucidBuild) {
    Write-Host "- Lucid package built (upload package.zip to Lucid developer portal)"
}
