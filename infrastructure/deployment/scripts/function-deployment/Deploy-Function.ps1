# ===================================
# Azure Function Deployment Script
# ===================================

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "tst", "prd", "all")]
    [string]$Environment = "dev",

    [Parameter(Mandatory=$false)]
    [switch]$Force,

    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

# Set error behavior
$ErrorActionPreference = "Stop"

# Get the root directory of the project
$scriptPath = $PSScriptRoot
$rootDir = (Get-Item $scriptPath).Parent.Parent.Parent.Parent.FullName
$projectPath = Join-Path $rootDir "dataconnectors\quodsi_data_connector_lucidchart_v2"

# Function to deploy to a specific environment
function Deploy-ToEnvironment {
    param (
        [string]$Env
    )

    # Set environment-specific variables
    switch ($Env) {
        "dev" {
            $functionAppName = "dev-quodsi-func-v1"
            $resourceGroup = "dev-quodsi-rg-01"
        }
        "tst" {
            $functionAppName = "tst-quodsi-func-v1"
            $resourceGroup = "tst-quodsi-rg-01"
        }
        "prd" {
            $functionAppName = "prd-quodsi-func-v1"
            $resourceGroup = "prd-quodsi-rg-01"
        }
        default {
            Write-Error "Invalid environment: $Env"
            return $false
        }
    }

    # Show settings
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Deployment Settings" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Environment:   $Env"
    Write-Host "Function App:  $functionAppName"
    Write-Host "Resource Group: $resourceGroup"
    Write-Host "Project Path:  $projectPath"
    Write-Host ""

    # Check if Function App exists
    try {
        $functionApp = az functionapp show --name $functionAppName --resource-group $resourceGroup | ConvertFrom-Json
        if (-not $functionApp) {
            Write-Error "Function App $functionAppName not found in resource group $resourceGroup"
            Write-Host "Make sure the Function App has been deployed with the ARM templates."
            return $false
        }
    }
    catch {
        Write-Error "Error checking Function App: $_"
        Write-Host "Make sure the Function App has been deployed with the ARM templates."
        return $false
    }

    # Confirm deployment if not forced
    if (-not $Force) {
        $confirmation = Read-Host "Continue with deployment to $Env environment? (Y/N)"
        if ($confirmation -ne "Y" -and $confirmation -ne "y") {
            Write-Host "Deployment canceled by user." -ForegroundColor Yellow
            return $false
        }
    }

    # Navigate to function app directory
    Write-Host "Changing to project directory..." -ForegroundColor Cyan
    Push-Location $projectPath
    
    try {
        if (-not $SkipBuild) {
            # Clean and rebuild
            Write-Host "Running clean..." -ForegroundColor Cyan
            npm run clean
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Error during clean step!"
                return $false
            }

            Write-Host "Running build..." -ForegroundColor Cyan
            npm run build
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Error during build step!"
                return $false
            }
        }
        else {
            Write-Host "Skipping build steps..." -ForegroundColor Yellow
        }

        # Deploy
        Write-Host "Deploying to $functionAppName..." -ForegroundColor Cyan
        if ($VerbosePreference -eq 'Continue') {
            func azure functionapp publish $functionAppName --verbose
        }
        else {
            func azure functionapp publish $functionAppName
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Deployment failed!"
            return $false
        }

        Write-Host "Deployment completed successfully!" -ForegroundColor Green
        Write-Host "Verifying deployed functions..." -ForegroundColor Cyan
        az functionapp function list --name $functionAppName --resource-group $resourceGroup -o table

        return $true
    }
    catch {
        Write-Error "An error occurred: $_"
        return $false
    }
    finally {
        # Return to original directory
        Pop-Location
    }
}

# Deploy to all environments or a specific one
if ($Environment -eq "all") {
    $environments = @("dev", "tst", "prd")
    $results = @{}
    
    foreach ($env in $environments) {
        Write-Host ""
        Write-Host "===================================" -ForegroundColor Magenta
        Write-Host "Deploying to $env environment" -ForegroundColor Magenta
        Write-Host "===================================" -ForegroundColor Magenta
        Write-Host ""
        
        $success = Deploy-ToEnvironment -Env $env
        $results[$env] = $success
    }
    
    # Summary
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Magenta
    Write-Host "Deployment Summary" -ForegroundColor Magenta
    Write-Host "===================================" -ForegroundColor Magenta
    
    foreach ($env in $environments) {
        $status = if ($results[$env]) { "Success" } else { "Failed" }
        $color = if ($results[$env]) { "Green" } else { "Red" }
        Write-Host "$env : " -NoNewline
        Write-Host $status -ForegroundColor $color
    }
}
else {
    Deploy-ToEnvironment -Env $Environment
}
