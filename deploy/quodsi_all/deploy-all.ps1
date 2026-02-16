<#
.SYNOPSIS
Deploys Azure Functions and builds the Lucid package in one operation.

.DESCRIPTION
This script orchestrates a full deployment by:
0. Running deployment verification checks
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

.PARAMETER SkipVerify
Skip the pre-deployment verification step

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
    [switch]$SkipLucidBuild,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$deployDir = (Get-Item $scriptDir).Parent.FullName

# Map environment to Azure script format (lowercase)
$azureEnv = $Environment.ToLower()

# Script paths
$verifyScript = Join-Path $deployDir "azure-functions\verify-deployment-ready.ps1"
$azureDeployScript = Join-Path $deployDir "azure-functions\deploy-function-code.ps1"
$lucidBuildScript = Join-Path $deployDir "lucid-package\build-bundle.ps1"

$overallStart = Get-Date

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Quodsi Full Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment"
Write-Host "Verify:       $(if ($SkipVerify) { 'SKIP' } else { 'YES' })"
Write-Host "Azure Deploy: $(if ($SkipAzureDeploy) { 'SKIP' } else { 'YES' })"
Write-Host "Lucid Build:  $(if ($SkipLucidBuild) { 'SKIP' } else { 'YES' })"
Write-Host ""

# Step 0: Run verification checks
if (-not $SkipVerify -and -not $SkipAzureDeploy) {
    Write-Host "================================================" -ForegroundColor Magenta
    Write-Host "Step 0: Pre-Deployment Verification" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor Magenta
    $stepStart = Get-Date

    if (-not (Test-Path $verifyScript)) {
        Write-Warning "Verification script not found at: $verifyScript"
        Write-Warning "Skipping verification step."
    }
    else {
        & $verifyScript

        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "Verification failed! Fix the issues above before deploying." -ForegroundColor Red
            Write-Host "  - Run 'npm install' in the function app directory" -ForegroundColor Gray
            Write-Host "  - Run 'npm run build' to create dist folder" -ForegroundColor Gray
            Write-Host "  - Use -SkipVerify to bypass this check (not recommended)" -ForegroundColor Gray
            exit $LASTEXITCODE
        }
    }

    $stepDuration = (Get-Date) - $stepStart
    Write-Host "Verification completed in $([math]::Round($stepDuration.TotalSeconds, 1))s" -ForegroundColor Gray
    Write-Host ""
} else {
    if ($SkipVerify) {
        Write-Host "Skipping pre-deployment verification." -ForegroundColor Yellow
    }
}

# Step 1: Deploy Azure Functions
if (-not $SkipAzureDeploy) {
    Write-Host "================================================" -ForegroundColor Magenta
    Write-Host "Step 1: Deploying Azure Functions ($azureEnv)" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor Magenta
    $stepStart = Get-Date

    $azureParams = @{
        Environment = $azureEnv
    }
    if ($Force) { $azureParams.Force = $true }

    & $azureDeployScript @azureParams

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Azure Function deployment failed!" -ForegroundColor Red
        Write-Host "  - Check the output above for detailed error information" -ForegroundColor Gray
        Write-Host "  - Try running the deploy script directly for more control:" -ForegroundColor Gray
        Write-Host "    $azureDeployScript -Environment $azureEnv -Force" -ForegroundColor White
        Write-Host "  - Use -SkipAzureDeploy to skip this step and build Lucid package only" -ForegroundColor Gray
        exit $LASTEXITCODE
    }

    $stepDuration = (Get-Date) - $stepStart
    Write-Host "Azure Function deployment completed in $([math]::Round($stepDuration.TotalSeconds, 1))s" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping Azure Function deployment." -ForegroundColor Yellow
}

# Step 2: Build Lucid Package
if (-not $SkipLucidBuild) {
    Write-Host "================================================" -ForegroundColor Magenta
    Write-Host "Step 2: Building Lucid Package ($Environment)" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor Magenta
    $stepStart = Get-Date

    & $lucidBuildScript -TargetEnvironment $Environment

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Lucid package build failed!" -ForegroundColor Red
        Write-Host "  - Check the output above for detailed error information" -ForegroundColor Gray
        Write-Host "  - Ensure shared library builds: npm run build -w @quodsi/shared" -ForegroundColor Gray
        Write-Host "  - Try running the build script directly:" -ForegroundColor Gray
        Write-Host "    $lucidBuildScript -TargetEnvironment $Environment" -ForegroundColor White
        exit $LASTEXITCODE
    }

    $stepDuration = (Get-Date) - $stepStart
    Write-Host "Lucid package build completed in $([math]::Round($stepDuration.TotalSeconds, 1))s" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping Lucid package build." -ForegroundColor Yellow
}

# Summary
$overallDuration = (Get-Date) - $overallStart

Write-Host "================================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Environment:  $Environment"
Write-Host "Total time:   $([math]::Round($overallDuration.TotalSeconds, 1))s"
if (-not $SkipAzureDeploy) {
    Write-Host "- Azure Functions deployed"
}
if (-not $SkipLucidBuild) {
    Write-Host "- Lucid package built (upload package.zip to Lucid developer portal)"
}
