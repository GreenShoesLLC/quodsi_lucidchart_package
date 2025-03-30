<#
.SYNOPSIS
Builds the quodsim-react React application for a specified target environment.

.DESCRIPTION
This script navigates to the project directory, cleans the previous build,
sets environment variables based on the target environment (Dev, TST, PRD),
verifies the variables, and then runs the 'npx react-scripts build' command.
The environment variables are set only for the scope of this script execution.

.PARAMETER TargetEnvironment
Specifies the target environment for the build. Must be one of 'Dev', 'TST', or 'PRD'.

.EXAMPLE
.\Build-QuodsimReact.ps1 -TargetEnvironment Dev

.EXAMPLE
.\Build-QuodsimReact.ps1 -TargetEnvironment TST

.EXAMPLE
.\Build-QuodsimReact.ps1 PRD # Parameter name can be omitted if it's the first positional parameter

.NOTES
Author: Gemini AI based on user input
Date:   2025-03-30
Requires PowerShell and Node.js/npm/npx installed and configured in PATH.
Ensure you have the necessary permissions to remove the build folder and run npx.
The Azure Function Key is sensitive; be mindful of where this script is stored and executed.
#>
param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('Dev', 'TST', 'PRD')]
    [string]$TargetEnvironment
)

# --- Configuration ---
# Set the path to your React project directory
$ProjectDirectory = "C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react"
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
    # Default case should not be hit due to ValidateSet, but included for completeness
    default {
        Write-Error "Invalid TargetEnvironment specified: '$TargetEnvironment'. This should not happen."
        exit 1
    }
}

# 4. Verify Environment Variables (as requested)
Write-Host "Verifying environment variables set in this session:" -ForegroundColor Yellow
Write-Host " REACT_APP_DATA_CONNECTOR_API_URL = $($env:REACT_APP_DATA_CONNECTOR_API_URL)"
# Consider security implications before printing keys to the console/logs
Write-Host " REACT_APP_AZURE_STATUS_FUNCTION_KEY set (length: $($env:REACT_APP_AZURE_STATUS_FUNCTION_KEY.Length)). Displaying value is suppressed for security."
# If you MUST see the key uncomment the line below, but be careful:
# Write-Host " REACT_APP_AZURE_STATUS_FUNCTION_KEY = $($env:REACT_APP_AZURE_STATUS_FUNCTION_KEY)"


# 5. Run the Build Command
Write-Host "Running 'npx react-scripts build'..." -ForegroundColor Cyan
try {
    # Execute npx and ensure output/errors are shown in the console
    npx react-scripts build *>&1 | Write-Host
    
    # Check the exit code of the last native command
    if ($LASTEXITCODE -ne 0) {
        Write-Error "React build script failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    } else {
        Write-Host "React build completed successfully!" -ForegroundColor Green
    }
}
catch {
    Write-Error "An error occurred while attempting to run 'npx react-scripts build'. Error: $($_.Exception.Message)"
    exit 1
}

Write-Host "Build script finished."