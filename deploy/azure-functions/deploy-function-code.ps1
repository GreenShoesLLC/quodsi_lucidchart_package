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
    [switch]$SkipBuild,

    [Parameter(Mandatory=$false)]
    [switch]$SkipDeploy,

    [Parameter(Mandatory=$false)]
    [switch]$UseFunc
)

# Set error behavior
$ErrorActionPreference = "Stop"

# Get the root directory of the project
$scriptPath = $PSScriptRoot
$rootDir = (Get-Item $scriptPath).Parent.Parent.FullName
$projectPath = Join-Path $rootDir "dataconnectors\quodsi_data_connector_lucidchart_v2"

# Function to run pre-flight diagnostics
function Run-PreFlightChecks {
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Pre-Flight Diagnostics" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan

    # func CLI version
    Write-Host "Azure Functions Core Tools:" -ForegroundColor Gray
    try {
        $funcVersion = func --version 2>&1
        Write-Host "  func --version: $funcVersion" -ForegroundColor Green
    }
    catch {
        if ($UseFunc) {
            Write-Host "  func CLI not found! Install Azure Functions Core Tools." -ForegroundColor Red
            Write-Host "  https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local" -ForegroundColor Gray
            return $false
        }
        else {
            Write-Host "  func CLI not found (not required for az zip deploy)" -ForegroundColor Yellow
        }
    }

    # Node.js version
    Write-Host "Node.js:" -ForegroundColor Gray
    try {
        $nodeVersion = node --version 2>&1
        Write-Host "  node --version: $nodeVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "  Node.js not found!" -ForegroundColor Red
        return $false
    }

    # Azure CLI login status
    Write-Host "Azure CLI:" -ForegroundColor Gray
    try {
        $azAccount = az account show 2>&1 | ConvertFrom-Json
        Write-Host "  Logged in as: $($azAccount.user.name)" -ForegroundColor Green
        Write-Host "  Subscription: $($azAccount.name)" -ForegroundColor Green
    }
    catch {
        Write-Host "  Not logged in to Azure CLI! Run 'az login' first." -ForegroundColor Red
        return $false
    }

    # Build output
    $distIndex = Join-Path $projectPath "dist\index.js"
    Write-Host "Build output:" -ForegroundColor Gray
    if (Test-Path $distIndex) {
        $distSize = (Get-Item $distIndex).Length
        Write-Host "  dist/index.js: exists ($([math]::Round($distSize / 1KB, 1)) KB)" -ForegroundColor Green
    }
    else {
        Write-Host "  dist/index.js: NOT FOUND (build required)" -ForegroundColor Yellow
    }

    Write-Host ""
    return $true
}

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
    $deployMethod = if ($UseFunc) { "func publish" } else { "az zip deploy" }
    Write-Host "Environment:   $Env"
    Write-Host "Function App:  $functionAppName"
    Write-Host "Resource Group: $resourceGroup"
    Write-Host "Project Path:  $projectPath"
    Write-Host "Deploy Method: $deployMethod"
    if ($SkipDeploy) {
        Write-Host "Mode:          DRY RUN (--SkipDeploy)" -ForegroundColor Yellow
    }
    Write-Host ""

    # Run pre-flight diagnostics
    $preFlightOk = Run-PreFlightChecks
    if (-not $preFlightOk) {
        Write-Error "Pre-flight checks failed. Fix the issues above before deploying."
        return $false
    }

    # Check if Function App exists
    Write-Host "Verifying Function App is accessible..." -ForegroundColor Cyan
    try {
        $functionApp = az functionapp show --name $functionAppName --resource-group $resourceGroup 2>&1 | ConvertFrom-Json
        if (-not $functionApp) {
            Write-Error "Function App $functionAppName not found in resource group $resourceGroup"
            Write-Host "Make sure the Function App has been deployed with the ARM templates."
            return $false
        }
        Write-Host "Function App '$functionAppName' found (state: $($functionApp.state))" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Error "Error checking Function App: $_"
        Write-Host "Make sure the Function App has been deployed with the ARM templates."
        return $false
    }

    # Confirm deployment if not forced
    if (-not $Force -and -not $SkipDeploy) {
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
        # Validate node_modules before deployment
        Write-Host "Validating node_modules..." -ForegroundColor Cyan

        if (-not (Test-Path "node_modules")) {
            Write-Error "node_modules folder not found! Run 'npm install' before deploying."
            return $false
        }

        # Check node_modules size (should be substantial, not nearly empty)
        $nodeModulesSize = (Get-ChildItem node_modules -Recurse -File | Measure-Object -Property Length -Sum).Sum
        $sizeInMB = [math]::Round($nodeModulesSize / 1MB, 2)

        Write-Host "node_modules size: $sizeInMB MB" -ForegroundColor Cyan

        if ($sizeInMB -lt 30) {
            Write-Warning "node_modules size is only $sizeInMB MB - this seems too small!"
            Write-Warning "Expected size is ~67MB. Dependencies may not be properly installed."
            Write-Warning ""
            Write-Warning "Possible cause: Function app is in root package.json workspaces array"
            Write-Warning "Solution: Remove from workspaces, delete node_modules, run 'npm install'"
            Write-Warning ""

            if (-not $Force) {
                $continue = Read-Host "Continue anyway? (Y/N)"
                if ($continue -ne "Y" -and $continue -ne "y") {
                    Write-Host "Deployment canceled." -ForegroundColor Yellow
                    return $false
                }
            }
        }

        # Check for critical Azure packages
        $azurePackages = @("@azure/functions", "@azure/batch", "@azure/storage-blob")
        $missingPackages = @()

        foreach ($package in $azurePackages) {
            $packagePath = "node_modules/$package"
            if (-not (Test-Path $packagePath)) {
                $missingPackages += $package
            }
        }

        if ($missingPackages.Count -gt 0) {
            Write-Warning "Missing critical Azure packages: $($missingPackages -join ', ')"
            Write-Warning "Run 'npm install' to install missing dependencies"

            if (-not $Force) {
                return $false
            }
        }

        Write-Host "node_modules validation passed" -ForegroundColor Green
        Write-Host ""

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

        # Verify build output exists before deploying
        if (-not (Test-Path "dist\index.js")) {
            Write-Error "dist/index.js not found! Build may have failed or was skipped."
            return $false
        }

        # Stop here if dry-run mode
        if ($SkipDeploy) {
            $method = if ($UseFunc) { "func publish" } else { "az zip deploy" }
            Write-Host "===================================" -ForegroundColor Yellow
            Write-Host "DRY RUN COMPLETE" -ForegroundColor Yellow
            Write-Host "===================================" -ForegroundColor Yellow
            Write-Host "All pre-flight checks and validation passed." -ForegroundColor Green
            Write-Host "Deploy method: $method" -ForegroundColor Cyan
            Write-Host "Re-run without -SkipDeploy to actually deploy." -ForegroundColor Cyan
            return $true
        }

        # Deploy
        if ($UseFunc) {
            # Legacy path: func azure functionapp publish
            $publishCmd = "func azure functionapp publish $functionAppName --verbose"
            Write-Host "===================================" -ForegroundColor Cyan
            Write-Host "Deploy method: func publish" -ForegroundColor Cyan
            Write-Host "Running deployment command:" -ForegroundColor Cyan
            Write-Host "  $publishCmd" -ForegroundColor White
            Write-Host "===================================" -ForegroundColor Cyan

            # Run func publish and capture output
            $publishOutput = & func azure functionapp publish $functionAppName --verbose 2>&1
            $publishExitCode = $LASTEXITCODE

            # Display all output
            foreach ($line in $publishOutput) {
                if ($line -is [System.Management.Automation.ErrorRecord]) {
                    Write-Host $line.ToString() -ForegroundColor Red
                }
                else {
                    Write-Host $line
                }
            }

            if ($publishExitCode -ne 0) {
                Write-Host ""
                Write-Host "===================================" -ForegroundColor Red
                Write-Host "DEPLOYMENT FAILED (func publish)" -ForegroundColor Red
                Write-Host "===================================" -ForegroundColor Red
                Write-Host "Exit code: $publishExitCode" -ForegroundColor Red
                Write-Host ""
                Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
                Write-Host "  1. Check the verbose output above for the actual error" -ForegroundColor Gray
                Write-Host "  2. Verify 'az login' is current (token may have expired)" -ForegroundColor Gray
                Write-Host "  3. Try without -UseFunc (default az zip deploy):" -ForegroundColor Gray
                Write-Host "     .\deploy\azure-functions\deploy-function-code.ps1 -Environment $Env -Force" -ForegroundColor White
                Write-Host ""
                return $false
            }
        }
        else {
            # Default path: az CLI zip deploy
            Write-Host "===================================" -ForegroundColor Cyan
            Write-Host "Deploy method: az zip deploy" -ForegroundColor Cyan
            Write-Host "===================================" -ForegroundColor Cyan

            # Create zip package
            $zipPath = Join-Path $env:TEMP "quodsi-func-deploy.zip"
            if (Test-Path $zipPath) {
                Remove-Item $zipPath -Force
            }

            Write-Host "Creating deployment zip package..." -ForegroundColor Cyan
            $zipItems = @("dist", "node_modules", "host.json", "package.json", "package-lock.json")
            $missingItems = @()
            foreach ($item in $zipItems) {
                if (-not (Test-Path $item)) {
                    $missingItems += $item
                }
            }
            if ($missingItems.Count -gt 0) {
                Write-Error "Missing required files for zip package: $($missingItems -join ', ')"
                return $false
            }

            Compress-Archive -Path $zipItems -DestinationPath $zipPath -Force
            $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
            Write-Host "Zip package created: $zipPath ($zipSize MB)" -ForegroundColor Green

            # Deploy via az CLI
            $deployCmd = "az functionapp deployment source config-zip -g $resourceGroup -n $functionAppName --src $zipPath"
            Write-Host "Running deployment command:" -ForegroundColor Cyan
            Write-Host "  $deployCmd" -ForegroundColor White
            Write-Host ""

            try {
                $deployOutput = az functionapp deployment source config-zip -g $resourceGroup -n $functionAppName --src $zipPath 2>&1
                $deployExitCode = $LASTEXITCODE

                foreach ($line in $deployOutput) {
                    Write-Host $line
                }

                if ($deployExitCode -ne 0) {
                    Write-Host ""
                    Write-Host "===================================" -ForegroundColor Red
                    Write-Host "DEPLOYMENT FAILED (az zip deploy)" -ForegroundColor Red
                    Write-Host "===================================" -ForegroundColor Red
                    Write-Host "Exit code: $deployExitCode" -ForegroundColor Red
                    Write-Host ""
                    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
                    Write-Host "  1. Verify 'az login' is current (token may have expired)" -ForegroundColor Gray
                    Write-Host "  2. Try the legacy func publish method:" -ForegroundColor Gray
                    Write-Host "     .\deploy\azure-functions\deploy-function-code.ps1 -Environment $Env -Force -UseFunc" -ForegroundColor White
                    Write-Host ""
                    return $false
                }
            }
            finally {
                # Clean up temp zip
                if (Test-Path $zipPath) {
                    Remove-Item $zipPath -Force
                    Write-Host "Cleaned up temp zip file." -ForegroundColor Gray
                }
            }
        }

        Write-Host "Deployment completed successfully!" -ForegroundColor Green

        # Set deployment version info in app settings
        Write-Host "Setting deployment version info..." -ForegroundColor Cyan
        $commitHash = git rev-parse --short HEAD
        $deployedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"

        az functionapp config appsettings set `
            --name $functionAppName `
            --resource-group $resourceGroup `
            --settings "DEPLOYED_COMMIT=$commitHash" "DEPLOYED_AT=$deployedAt" `
            --output none

        Write-Host "Version info set: DEPLOYED_COMMIT=$commitHash, DEPLOYED_AT=$deployedAt" -ForegroundColor Green

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
    $null = Deploy-ToEnvironment -Env $Environment
}
