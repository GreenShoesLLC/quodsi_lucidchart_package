# ========================================================
# Azure Function Deployment Verification Script
# ========================================================
#
# This script verifies that the function app is properly
# configured for deployment, especially checking that
# node_modules is complete and will be included.
#
# Usage: .\Verify-DeploymentReady.ps1
#

[CmdletBinding()]
param()

# Set error behavior
$ErrorActionPreference = "Continue"

# Get the root directory of the project
$scriptPath = $PSScriptRoot
$rootDir = (Get-Item $scriptPath).Parent.Parent.FullName
$projectPath = Join-Path $rootDir "dataconnectors\quodsi_data_connector_lucidchart_v2"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Azure Function Deployment Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checking: $projectPath" -ForegroundColor Cyan
Write-Host ""

$allChecks = @()
$passedChecks = 0
$failedChecks = 0
$warnings = 0

# Helper function to record check result
function Record-Check {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Message,
        [string]$Level = "Error"  # Error, Warning, Info
    )

    $script:allChecks += [PSCustomObject]@{
        Name = $Name
        Passed = $Passed
        Message = $Message
        Level = $Level
    }

    if ($Passed) {
        Write-Host "✓ $Name" -ForegroundColor Green
        if ($Message) {
            Write-Host "  $Message" -ForegroundColor Gray
        }
        $script:passedChecks++
    } else {
        if ($Level -eq "Warning") {
            Write-Host "⚠ $Name" -ForegroundColor Yellow
            $script:warnings++
        } else {
            Write-Host "✗ $Name" -ForegroundColor Red
            $script:failedChecks++
        }
        Write-Host "  $Message" -ForegroundColor Gray
    }
    Write-Host ""
}

# Change to project directory
Push-Location $projectPath

try {
    # Check 1: Project directory exists
    if (Test-Path $projectPath) {
        Record-Check "Project directory exists" $true "Found at: $projectPath"
    } else {
        Record-Check "Project directory exists" $false "Directory not found: $projectPath"
        Write-Host "Cannot continue without project directory." -ForegroundColor Red
        exit 1
    }

    # Check 2: package.json exists
    if (Test-Path "package.json") {
        Record-Check "package.json exists" $true
    } else {
        Record-Check "package.json exists" $false "package.json not found in function app directory"
    }

    # Check 3: tsconfig.json configuration
    if (Test-Path "tsconfig.json") {
        $tsconfig = Get-Content "tsconfig.json" | ConvertFrom-Json
        $rootDir = $tsconfig.compilerOptions.rootDir
        $outDir = $tsconfig.compilerOptions.outDir

        if ($rootDir -eq "./src" -and $outDir -eq "dist") {
            Record-Check "TypeScript configuration" $true "rootDir: ./src, outDir: dist"
        } else {
            Record-Check "TypeScript configuration" $false "Expected rootDir='./src', outDir='dist'. Got rootDir='$rootDir', outDir='$outDir'" "Warning"
        }
    } else {
        Record-Check "tsconfig.json exists" $false "tsconfig.json not found"
    }

    # Check 4: dist folder structure
    if (Test-Path "dist") {
        if (Test-Path "dist/index.js") {
            Record-Check "dist/index.js at root" $true "Entry point is at dist/index.js (correct)"
        } else {
            Record-Check "dist/index.js at root" $false "index.js not found at dist/index.js. May be at dist/src/index.js (incorrect)" "Warning"
        }
    } else {
        Record-Check "dist folder exists" $false "Run 'npm run build' to create dist folder" "Warning"
    }

    # Check 5: node_modules exists
    if (Test-Path "node_modules") {
        Record-Check "node_modules folder exists" $true

        # Check 6: node_modules size
        $nodeModulesSize = (Get-ChildItem node_modules -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeInMB = [math]::Round($nodeModulesSize / 1MB, 2)

        if ($sizeInMB -ge 50) {
            Record-Check "node_modules size adequate" $true "Size: $sizeInMB MB (good)"
        } elseif ($sizeInMB -ge 30) {
            Record-Check "node_modules size adequate" $true "Size: $sizeInMB MB (acceptable, but expected ~67MB)" "Warning"
        } else {
            Record-Check "node_modules size adequate" $false "Size: $sizeInMB MB (too small! Expected ~67MB)"
        }

        # Check 7: Package count
        $packageCount = (Get-ChildItem node_modules -Directory | Measure-Object).Count
        if ($packageCount -ge 100) {
            Record-Check "Package count sufficient" $true "Found $packageCount packages (expected ~170+)"
        } else {
            Record-Check "Package count sufficient" $false "Only $packageCount packages (expected ~170+)"
        }

        # Check 8: Critical Azure packages
        $azurePackages = @("@azure/functions", "@azure/batch", "@azure/storage-blob")
        $allAzurePresent = $true
        $missingAzure = @()

        foreach ($package in $azurePackages) {
            if (-not (Test-Path "node_modules/$package")) {
                $allAzurePresent = $false
                $missingAzure += $package
            }
        }

        if ($allAzurePresent) {
            Record-Check "Critical Azure packages present" $true "All required @azure packages found"
        } else {
            Record-Check "Critical Azure packages present" $false "Missing: $($missingAzure -join ', ')"
        }

    } else {
        Record-Check "node_modules folder exists" $false "Run 'npm install' in this directory"
        Record-Check "node_modules size adequate" $false "node_modules doesn't exist"
        Record-Check "Package count sufficient" $false "node_modules doesn't exist"
        Record-Check "Critical Azure packages present" $false "node_modules doesn't exist"
    }

    # Check 9: Not in workspace configuration
    $rootPackageJson = Get-Content (Join-Path $rootDir "package.json") | ConvertFrom-Json
    if ($rootPackageJson.workspaces) {
        $inWorkspaces = $rootPackageJson.workspaces -contains "dataconnectors/quodsi_data_connector_lucidchart_v2"

        if (-not $inWorkspaces) {
            Record-Check "NOT in workspace configuration" $true "Function app correctly excluded from workspaces"
        } else {
            Record-Check "NOT in workspace configuration" $false "Function app should NOT be in root package.json workspaces array"
        }
    } else {
        Record-Check "NOT in workspace configuration" $true "No workspaces configured (OK)"
    }

    # Check 10: .funcignore configuration
    if (Test-Path ".funcignore") {
        $funcignore = Get-Content ".funcignore"
        $hasNodeModulesBin = $funcignore -contains "node_modules/.bin"
        $hasNodeModules = $funcignore -contains "node_modules" -or $funcignore -contains "node_modules/"

        if ($hasNodeModulesBin -and -not $hasNodeModules) {
            Record-Check ".funcignore configuration" $true "Correctly excludes node_modules/.bin but not node_modules"
        } elseif ($hasNodeModules) {
            Record-Check ".funcignore configuration" $false ".funcignore excludes 'node_modules' - this will prevent dependencies from deploying!"
        } else {
            Record-Check ".funcignore configuration" $true "node_modules will be included (node_modules/.bin should be excluded)" "Warning"
        }
    } else {
        Record-Check ".funcignore exists" $false ".funcignore file not found" "Warning"
    }

    # Check 11: host.json exists
    if (Test-Path "host.json") {
        Record-Check "host.json exists" $true
    } else {
        Record-Check "host.json exists" $false "host.json is required for Azure Functions"
    }

} finally {
    Pop-Location
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed:   $passedChecks" -ForegroundColor Green
Write-Host "Failed:   $failedChecks" -ForegroundColor Red
Write-Host "Warnings: $warnings" -ForegroundColor Yellow
Write-Host ""

if ($failedChecks -eq 0) {
    Write-Host "✓ All critical checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The function app appears ready for deployment." -ForegroundColor Green

    if ($warnings -gt 0) {
        Write-Host ""
        Write-Host "Note: There are $warnings warning(s). Review them above." -ForegroundColor Yellow
    }

    exit 0
} else {
    Write-Host "✗ $failedChecks check(s) failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the issues above before deploying." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  - Run 'npm install' in the function app directory" -ForegroundColor Gray
    Write-Host "  - Remove function app from root package.json workspaces" -ForegroundColor Gray
    Write-Host "  - Run 'npm run build' to create dist folder" -ForegroundColor Gray
    Write-Host ""

    exit 1
}
