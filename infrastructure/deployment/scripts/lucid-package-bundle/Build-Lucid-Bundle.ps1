<#
.SYNOPSIS
Orchestrates the build process for the Quodsi Lucidchart package bundle.

.DESCRIPTION
This script sets the required environment variables based on the target environment.
Optionally, it can first call the separate React application build script (`Build-QuodsimReact.ps1`).
By default, the separate React build is SKIPPED.
It then changes the working directory to the main package root, cleans up specific
build/public artifact directories, and finally executes the `npx lucid-package@latest bundle`
command, which will perform its own build using the environment variables set by this script.

.PARAMETER TargetEnvironment
Specifies the target environment for the build. This value determines which environment
variables are set. Must be one of 'Dev', 'TST', or 'PRD'.

.PARAMETER RunReactBuild
A switch parameter. If included, the script will first execute the separate
`Build-QuodsimReact.ps1` script before proceeding to the Lucid bundle step.
If omitted (default), the separate React build step is skipped.

.EXAMPLE
# Build the bundle using DEV settings, skipping the separate React build (default)
.\Build-Lucid-Bundle.ps1 -TargetEnvironment Dev

.EXAMPLE
# Build the bundle using TST settings, FORCING the separate React build first
.\Build-Lucid-Bundle.ps1 -TargetEnvironment TST -RunReactBuild

.EXAMPLE
# Build using PRD settings, skipping separate React build, using full path
C:\path\to\scripts\lucid-package-bundle\Build-Lucid-Bundle.ps1 -TargetEnvironment PRD

.NOTES
Author: Gemini AI based on user input
Date:   2025-03-30 (Modified)
Requires:
 - PowerShell
 - Node.js/npm/npx installed and in PATH
 - The Build-QuodsimReact.ps1 script located at the specified path (if using -RunReactBuild).
 - The lucid-package tool (installed via npx).
Ensure paths defined in the script ($ReactBuildScriptPath, $LucidPackageDir, $ReactBuildOutputDir, $PublicReactDir) are correct.
#>
param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('Dev', 'TST', 'PRD')]
    [string]$TargetEnvironment,

    [Parameter()] # Optional switch parameter
    [switch]$RunReactBuild
)

# --- Configuration ---
$ReactBuildScriptPath = "C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\react-deployment\Build-QuodsimReact.ps1"
$LucidPackageDir = "C:\_source\Greenshoes\quodsi_lucidchart_package"
$ReactBuildOutputDir = "C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\build"
$PublicReactDir = "C:\_source\Greenshoes\quodsi_lucidchart_package\public\quodsim-react"
$ScriptName = $MyInvocation.MyCommand.Name

# --- Script Start ---
Write-Host "Starting Lucid Package Bundle process ($ScriptName)..."
Write-Host "Target Environment: $TargetEnvironment" -ForegroundColor Cyan
if ($RunReactBuild) {
    Write-Host "Option specified: -RunReactBuild (Separate React build WILL be executed)" -ForegroundColor Yellow
} else {
    Write-Host "Option NOT specified: -RunReactBuild (Separate React build WILL BE SKIPPED)" -ForegroundColor Yellow
}


# --- Step 1: Set Environment Variables in THIS script's scope ---
# (This is always needed for the final npx lucid-package bundle command)
Write-Host "--------------------------------------------------"
Write-Host "Step 1: Setting Environment Variables for '$TargetEnvironment'..."
Write-Host "--------------------------------------------------"
switch ($TargetEnvironment) {
    'Dev' {
        $env:REACT_APP_DATA_CONNECTOR_API_URL = "https://dev-quodsi-func-v1.azurewebsites.net/api/"
        $env:REACT_APP_AZURE_STATUS_FUNCTION_KEY = "zwH0vpBDPYko4QfIbNC9TjJRu4gZP9wbWu8CHuLFMrUkAzFuTazGeg=="
        Write-Host "DEV environment variables set for this session." -ForegroundColor Green
    }
    'TST' {
        $env:REACT_APP_DATA_CONNECTOR_API_URL = "https://tst-quodsi-func-v1.azurewebsites.net/api/"
        $env:REACT_APP_AZURE_STATUS_FUNCTION_KEY = "w1ERk9gEfFWk8745DeA1DiuUrflDv6sVPpQOpjudXcCGAzFuawHc-g=="
        Write-Host "TST environment variables set for this session." -ForegroundColor Green
    }
    'PRD' {
        $env:REACT_APP_DATA_CONNECTOR_API_URL = "https://prd-quodsi-func-v1.azurewebsites.net/api/"
        $env:REACT_APP_AZURE_STATUS_FUNCTION_KEY = "IuYzy5x9yt6FRhQhL5U9j8bXePABxfSEbVQ0pVEPk6fuAzFuE0P6tw=="
        Write-Host "PRD environment variables set for this session." -ForegroundColor Green
    }
    default {
        Write-Error "Invalid TargetEnvironment specified: '$TargetEnvironment'. This should not happen."
        exit 1
    }
}
# Verification (optional)
# Write-Host "Verifying variables set in this session:" -ForegroundColor Yellow
# Write-Host " REACT_APP_DATA_CONNECTOR_API_URL = $($env:REACT_APP_DATA_CONNECTOR_API_URL)"
# Write-Host " REACT_APP_AZURE_STATUS_FUNCTION_KEY is set (Length: $($env:REACT_APP_AZURE_STATUS_FUNCTION_KEY.Length))"


# --- Step 2: [Optional] Execute the Separate React Build Script ---
Write-Host "--------------------------------------------------"
Write-Host "Step 2: Separate React Build Execution..."
Write-Host "--------------------------------------------------"

if ($RunReactBuild) {
    Write-Host "Executing separate React build script because -RunReactBuild was specified." -ForegroundColor Cyan

    if (-not (Test-Path -Path $ReactBuildScriptPath -PathType Leaf)) {
        Write-Error "React build script not found at '$ReactBuildScriptPath'. Cannot run requested build. Aborting."
        exit 1
    }

    Write-Host "Calling: $ReactBuildScriptPath -TargetEnvironment $TargetEnvironment"
    & $ReactBuildScriptPath -TargetEnvironment $TargetEnvironment

    if ($LASTEXITCODE -ne 0) {
        Write-Error "The React build script ($ReactBuildScriptPath) failed with exit code $LASTEXITCODE. Aborting Lucid bundle process."
        exit $LASTEXITCODE
    } else {
        Write-Host "Separate React build script completed successfully." -ForegroundColor Green
    }
} else {
    Write-Host "Skipping separate React build script because -RunReactBuild was NOT specified." -ForegroundColor Yellow
    Write-Host "(Environment variables are still set for the subsequent lucid-package build.)"
}


# --- Step 3: Change Directory to Lucid Package Root ---
Write-Host "--------------------------------------------------"
Write-Host "Step 3: Changing directory..."
Write-Host "--------------------------------------------------"

Write-Host "Changing directory to '$LucidPackageDir'..."
try {
    Set-Location -Path $LucidPackageDir -ErrorAction Stop
    Write-Host "Successfully changed directory to: $(Get-Location)" -ForegroundColor Green
}
catch {
    Write-Error "Failed to change directory to '$LucidPackageDir'. Error: $($_.Exception.Message). Aborting Lucid bundle process."
    exit 1
}


# --- Step 4: Clean Target Directories Before Bundle --- (NEW STEP)
Write-Host "--------------------------------------------------"
Write-Host "Step 4: Cleaning target directories before bundling..."
Write-Host "--------------------------------------------------"

# Clean React Build Output Directory (if it exists)
Write-Host "Attempting to remove directory: $ReactBuildOutputDir"
if (Test-Path -Path $ReactBuildOutputDir -PathType Container) {
    try {
        Remove-Item -Path $ReactBuildOutputDir -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully removed directory: $ReactBuildOutputDir" -ForegroundColor Green
    } catch {
        Write-Warning "Could not remove directory '$ReactBuildOutputDir'. Error: $($_.Exception.Message)"
        # Continue even if cleanup fails
    }
} else {
    Write-Host "Directory does not exist, no cleanup needed: $ReactBuildOutputDir" -ForegroundColor Yellow
}

# Clean Public React Directory (if it exists)
Write-Host "Attempting to remove directory: $PublicReactDir"
if (Test-Path -Path $PublicReactDir -PathType Container) {
     try {
        Remove-Item -Path $PublicReactDir -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully removed directory: $PublicReactDir" -ForegroundColor Green
    } catch {
        Write-Warning "Could not remove directory '$PublicReactDir'. Error: $($_.Exception.Message)"
         # Continue even if cleanup fails
    }
} else {
     Write-Host "Directory does not exist, no cleanup needed: $PublicReactDir" -ForegroundColor Yellow
}


# --- Step 5: Run Lucid Package Bundle Command (Always Runs) --- (Renumbered)
Write-Host "--------------------------------------------------"
Write-Host "Step 5: Running Lucid Package Bundle (using set Env Vars)..."
Write-Host "--------------------------------------------------"

Write-Host "Executing 'npx lucid-package@latest bundle' in $(Get-Location)..."
try {
    npx lucid-package@latest bundle *>&1 | Write-Host

    if ($LASTEXITCODE -ne 0) {
        Write-Error "'npx lucid-package@latest bundle' command failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    } else {
        Write-Host "Lucid package bundle command completed successfully." -ForegroundColor Green
    }
}
catch {
    Write-Error "An error occurred while attempting to run 'npx lucid-package@latest bundle'. Error: $($_.Exception.Message)"
    exit 1
}

# --- Script End ---
Write-Host "--------------------------------------------------"
Write-Host "Lucid Package Bundle process ($ScriptName) completed successfully for environment '$TargetEnvironment'." -ForegroundColor Green
Write-Host "--------------------------------------------------"