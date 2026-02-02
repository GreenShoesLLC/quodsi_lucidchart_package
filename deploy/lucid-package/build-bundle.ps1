<#
.SYNOPSIS
Orchestrates the build process for the Quodsi Lucidchart package bundle.

.DESCRIPTION
This script:
1. Sets the required environment variables based on the target environment
2. Cleans build artifacts (extension.js, React build folders) to force a fresh build
3. Copies the environment-specific manifest file
4. Runs 'npx lucid-package build-editor-extension' which builds both the extension AND React app
5. Runs 'npx lucid-package bundle' to create the final package.zip
6. Restores the original manifest.json

The React build is triggered automatically by the webpack plugin when building the editor extension.

.PARAMETER TargetEnvironment
Specifies the target environment for the build. This value determines which environment
variables and manifest file are used. Must be one of 'Dev', 'TST', or 'PRD'.

.PARAMETER RunReactBuild
DEPRECATED - The React build now happens automatically as part of the editor extension build.
This parameter is kept for backwards compatibility but has no effect.

.EXAMPLE
# Build the bundle for Development environment
.\build-bundle.ps1 -TargetEnvironment Dev

.EXAMPLE
# Build the bundle for Test environment
.\build-bundle.ps1 -TargetEnvironment TST

.EXAMPLE
# Build the bundle for Production environment
.\build-bundle.ps1 -TargetEnvironment PRD

.NOTES
Date:   2025-11-25 (Modified)
Requires:
 - PowerShell
 - Node.js/npm/npx installed and in PATH
 - The lucid-package tool (installed via npx)
Ensure paths defined in the script ($LucidPackageDir, $ReactBuildOutputDir, $PublicReactDir) are correct.
#>
param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('Dev', 'TST', 'PRD')]
    [string]$TargetEnvironment,

    [Parameter()] # Optional switch parameter
    [switch]$RunReactBuild
)

# --- Configuration ---
$ReactBuildScriptPath = "C:\_source\Greenshoes\quodsi_lucidchart_package\deploy\react\build-react.ps1"
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


# --- Step 1.5: Build Shared Library ---
Write-Host "--------------------------------------------------"
Write-Host "Step 1.5: Building Shared Library (@quodsi/shared)..."
Write-Host "--------------------------------------------------"

Write-Host "Executing 'npm run build -w @quodsi/shared' in $LucidPackageDir..."
try {
    Push-Location -Path $LucidPackageDir
    npm run build -w @quodsi/shared *>&1 | Write-Host

    if ($LASTEXITCODE -ne 0) {
        Write-Error "'npm run build -w @quodsi/shared' command failed with exit code $LASTEXITCODE."
        Pop-Location
        exit $LASTEXITCODE
    } else {
        Write-Host "Shared library build completed successfully." -ForegroundColor Green
    }
    Pop-Location
}
catch {
    Pop-Location
    Write-Error "An error occurred while building the shared library. Error: $($_.Exception.Message)"
    exit 1
}


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


# --- Step 4: Clean Target Directories Before Bundle ---
Write-Host "--------------------------------------------------"
Write-Host "Step 4: Cleaning target directories before bundling..."
Write-Host "--------------------------------------------------"

# Clean extension.js to force a full rebuild (which triggers the React build)
$ExtensionJsPath = "editorextensions\quodsi_editor_extension\bin\extension.js"
Write-Host "Attempting to remove: $ExtensionJsPath"
if (Test-Path -Path $ExtensionJsPath -PathType Leaf) {
    try {
        Remove-Item -Path $ExtensionJsPath -Force -ErrorAction Stop
        Write-Host "Successfully removed: $ExtensionJsPath (forces rebuild)" -ForegroundColor Green
    } catch {
        Write-Warning "Could not remove '$ExtensionJsPath'. Error: $($_.Exception.Message)"
    }
} else {
    Write-Host "File does not exist, no cleanup needed: $ExtensionJsPath" -ForegroundColor Yellow
}

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

# Clean Public React Directory (if it exists) - will be recreated by the build
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


# --- Step 4.5: Select Correct Manifest for Target Environment --- (NEW STEP)
Write-Host "--------------------------------------------------"
Write-Host "Step 4.5: Selecting manifest for $TargetEnvironment environment..."
Write-Host "--------------------------------------------------"

# Determine which manifest to use based on target environment
$ManifestSource = switch ($TargetEnvironment) {
    'Dev' { "manifest_dev.json" }
    'TST' { "manifest_test.json" }
    'PRD' { "manifest_prod.json" }
    default {
        Write-Host "No target environment specified, using default manifest.json (localhost)" -ForegroundColor Yellow
        $null  # Don't copy anything, use existing manifest.json
    }
}

if ($ManifestSource) {
    Write-Host "Using manifest: $ManifestSource" -ForegroundColor Cyan

    # Backup original manifest.json
    if (Test-Path "manifest.json") {
        try {
            Copy-Item -Path "manifest.json" -Destination "manifest.json.backup" -Force -ErrorAction Stop
            Write-Host "Backed up manifest.json -> manifest.json.backup" -ForegroundColor Gray
        } catch {
            Write-Warning "Could not backup manifest.json: $($_.Exception.Message)"
        }
    }

    # Copy the environment-specific manifest to manifest.json (what bundle uses)
    try {
        if (-not (Test-Path $ManifestSource)) {
            Write-Error "Manifest file not found: $ManifestSource"
            exit 1
        }

        Copy-Item -Path $ManifestSource -Destination "manifest.json" -Force -ErrorAction Stop
        Write-Host "[OK] Copied $ManifestSource -> manifest.json" -ForegroundColor Green
    } catch {
        Write-Error "Failed to copy manifest file: $($_.Exception.Message)"
        exit 1
    }

    # Validate the manifest URL matches expected environment
    try {
        $manifestContent = Get-Content "manifest.json" -Raw | ConvertFrom-Json
        $callbackUrl = $manifestContent.dataConnectors[0].callbackBaseUrl

        $expectedUrlPattern = switch ($TargetEnvironment) {
            'Dev' { "https://dev-quodsi-func-v1.azurewebsites.net" }
            'TST' { "https://tst-quodsi-func-v1.azurewebsites.net" }
            'PRD' { "https://prd-quodsi-func-v1.azurewebsites.net" }
        }

        if ($callbackUrl -like "$expectedUrlPattern*") {
            Write-Host "[OK] Manifest URL validated: $callbackUrl" -ForegroundColor Green
        } else {
            Write-Error "Manifest URL mismatch! Expected $expectedUrlPattern* but got $callbackUrl"
            exit 1
        }
    } catch {
        Write-Warning "Could not validate manifest URL: $($_.Exception.Message)"
    }
} else {
    Write-Host "Using existing manifest.json (local development mode)" -ForegroundColor Cyan
}

Write-Host ""


# --- Step 5: Build Editor Extension (includes React build) ---
Write-Host "--------------------------------------------------"
Write-Host "Step 5: Building Editor Extension (includes React build)..."
Write-Host "--------------------------------------------------"

Write-Host "Executing 'npx lucid-package@latest build-editor-extension quodsi_editor_extension' in $(Get-Location)..."
try {
    npx lucid-package@latest build-editor-extension quodsi_editor_extension *>&1 | Write-Host

    if ($LASTEXITCODE -ne 0) {
        Write-Error "'npx lucid-package@latest build-editor-extension' command failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    } else {
        Write-Host "Editor extension build completed successfully." -ForegroundColor Green
    }
}
catch {
    Write-Error "An error occurred while attempting to run 'npx lucid-package@latest build-editor-extension'. Error: $($_.Exception.Message)"
    exit 1
}

# --- Step 5.5: Create Package Bundle ---
Write-Host "--------------------------------------------------"
Write-Host "Step 5.5: Creating Package Bundle..."
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


# --- Step 6: Restore Original Manifest --- (NEW STEP)
Write-Host "--------------------------------------------------"
Write-Host "Step 6: Restoring original manifest..."
Write-Host "--------------------------------------------------"

# Restore original manifest.json if it was backed up
if (Test-Path "manifest.json.backup") {
    try {
        Move-Item -Path "manifest.json.backup" -Destination "manifest.json" -Force -ErrorAction Stop
        Write-Host "[OK] Original manifest.json restored from backup" -ForegroundColor Green
    } catch {
        Write-Warning "Could not restore manifest.json from backup: $($_.Exception.Message)"
        Write-Warning "You may need to manually restore manifest.json"
    }
} else {
    Write-Host "No manifest backup found, manifest.json unchanged" -ForegroundColor Gray
}

Write-Host ""


# --- Script End ---
Write-Host "--------------------------------------------------"
Write-Host "Lucid Package Bundle process ($ScriptName) completed successfully for environment '$TargetEnvironment'." -ForegroundColor Green
Write-Host "--------------------------------------------------"