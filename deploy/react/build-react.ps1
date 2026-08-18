<#
.SYNOPSIS
Builds the quodsim-react React application for a specified target environment.

.DESCRIPTION
This script navigates to the project directory, cleans the previous build,
sets environment variables based on the target environment (Dev, TST, PRD),
verifies the variables, and then runs the 'npm run build' command (Vite).
The environment variables are set only for the scope of this script execution.

This script is optional and not part of the normal build path.
deploy/lucid-package/build-bundle.ps1 builds the React app itself at its
Step 5, via the extension's webpack hook, regardless of whether this script
runs. This standalone script only executes when build-bundle.ps1 is invoked
with the -RunReactBuild switch.

.PARAMETER TargetEnvironment
Specifies the target environment for the build. Must be one of 'Dev', 'TST', or 'PRD'.

.EXAMPLE
.\build-react.ps1 -TargetEnvironment Dev

.EXAMPLE
.\build-react.ps1 -TargetEnvironment TST

.EXAMPLE
.\build-react.ps1 PRD # Parameter name can be omitted if it's the first positional parameter

.NOTES
Requires PowerShell and Node.js/npm/npx installed and configured in PATH.
Ensure you have the necessary permissions to remove the build folder and run npx.
#>
param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('Dev', 'TST', 'PRD')]
    [string]$TargetEnvironment
)

# --- Configuration ---
# Set the path to your React project directory
$rootDir = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$ProjectDirectory = Join-Path $rootDir "editorextensions\quodsi_editor_extension\quodsim-react"
$BuildOutputDirectory = Join-Path -Path $ProjectDirectory -ChildPath "build"

# --- Script Start ---
Write-Host "Starting build process for quodsim-react..."
Write-Host "Target Environment: $TargetEnvironment" -ForegroundColor Cyan

# 1. Set Working Directory
Write-Host "Setting working directory to '$ProjectDirectory'..."
try {
    Set-Location -Path $ProjectDirectory -ErrorAction Stop
    Write-Host "Successfully changed directory." -ForegroundColor Green
}
catch {
    Write-Error "Failed to set working directory to '$ProjectDirectory'. Please ensure the path is correct. Error: $($_.Exception.Message)"
    # Exit the script if we can't change directory
    exit 1
}

# 2. Clean previous build directory (if it exists)
Write-Host "Attempting to remove previous build directory: '$BuildOutputDirectory'..."
if (Test-Path -Path $BuildOutputDirectory -PathType Container) {
    try {
        Remove-Item -Path $BuildOutputDirectory -Recurse -Force -ErrorAction Stop
        Write-Host "Previous build directory removed successfully." -ForegroundColor Green
    }
    catch {
        # Write a warning but continue, as the build might still work if cleanup failed partially
        Write-Warning "Could not remove '$BuildOutputDirectory'. Check permissions or if files are in use. Error: $($_.Exception.Message)"
    }
} else {
    Write-Host "Build directory does not exist. No cleanup needed."
}

# 3. Set Environment Variables Based on Target Environment
Write-Host "Setting environment variables for '$TargetEnvironment'..."
switch ($TargetEnvironment) {
    'Dev' {
        $env:VITE_DATA_CONNECTOR_API_URL = "https://dev-quodsi-func-v1.azurewebsites.net/api/"
        Write-Host "DEV environment variables set for this session." -ForegroundColor Green
    }
    'TST' {
        $env:VITE_DATA_CONNECTOR_API_URL = "https://tst-quodsi-func-v1.azurewebsites.net/api/"
        Write-Host "TST environment variables set for this session." -ForegroundColor Green
    }
    'PRD' {
        $env:VITE_DATA_CONNECTOR_API_URL = "https://prd-quodsi-func-v1.azurewebsites.net/api/"
        Write-Host "PRD environment variables set for this session." -ForegroundColor Green
    }
    # Default case should not be hit due to ValidateSet, but included for completeness
    default {
        Write-Error "Invalid TargetEnvironment specified: '$TargetEnvironment'. This should not happen."
        exit 1
    }
}

# 4. Verify Environment Variables (as requested)
Write-Host "Verifying environment variables set in this session:" -ForegroundColor Yellow
Write-Host " VITE_DATA_CONNECTOR_API_URL = $($env:VITE_DATA_CONNECTOR_API_URL)"


# 5. Run the Build Command
Write-Host "Running 'npm run build' (Vite)..." -ForegroundColor Cyan
try {
    # Execute npm and ensure output/errors are shown in the console
    npm run build *>&1 | Write-Host

    # Check the exit code of the last native command
    if ($LASTEXITCODE -ne 0) {
        Write-Error "React build script failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    } else {
        Write-Host "React build completed successfully!" -ForegroundColor Green
    }
}
catch {
    Write-Error "An error occurred while attempting to run 'npm run build'. Error: $($_.Exception.Message)"
    exit 1
}

Write-Host "Build script finished."