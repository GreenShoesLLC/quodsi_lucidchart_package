# PowerShell script to prepare ARM template parameter files for deployment
# This script replaces placeholders with actual connection strings without storing sensitive data in source control

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "tst", "prd", "all")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$BatchStorageConnectionString,
    
    [Parameter(Mandatory=$false)]
    [string]$DevStorageConnectionString,
    
    [Parameter(Mandatory=$false)]
    [string]$TstStorageConnectionString,
    
    [Parameter(Mandatory=$false)]
    [string]$PrdStorageConnectionString
)

# Paths to parameter files
$devParamsFile = ".\quodsi-function-dev-params-v2.json"
$tstParamsFile = ".\quodsi-function-tst-params-v2.json"
$prdParamsFile = ".\quodsi-function-prd-params-v2.json"

# If batch storage connection string wasn't provided, prompt for it if needed
if (-not $BatchStorageConnectionString -and ($Environment -eq "all" -or $Environment -eq "dev" -or $Environment -eq "tst" -or $Environment -eq "prd")) {
    $BatchStorageConnectionString = Read-Host "Enter the Batch storage connection string"
}

# Prepare DEV environment
if ($Environment -eq "dev" -or $Environment -eq "all") {
    Write-Host "Preparing DEV environment parameters..."
    
    # If dev storage connection string wasn't provided, prompt for it
    if (-not $DevStorageConnectionString) {
        $DevStorageConnectionString = Read-Host "Enter the DEV storage connection string"
    }
    
    # Read the parameter file
    $devParams = Get-Content $devParamsFile -Raw
    
    # Replace placeholders
    $devParams = $devParams -replace "BATCH_STORAGE_CONNECTION_STRING_PLACEHOLDER", $BatchStorageConnectionString
    $devParams = $devParams -replace "DEV_STORAGE_CONNECTION_STRING_PLACEHOLDER", $DevStorageConnectionString
    
    # Write to temporary file
    $devParams | Out-File ".\temp-dev-params.json" -Encoding utf8
    
    Write-Host "DEV parameters prepared: temp-dev-params.json"
}

# Prepare TST environment
if ($Environment -eq "tst" -or $Environment -eq "all") {
    Write-Host "Preparing TST environment parameters..."
    
    # If tst storage connection string wasn't provided, prompt for it
    if (-not $TstStorageConnectionString) {
        $TstStorageConnectionString = Read-Host "Enter the TST storage connection string"
    }
    
    # Read the parameter file
    $tstParams = Get-Content $tstParamsFile -Raw
    
    # Replace placeholders
    $tstParams = $tstParams -replace "BATCH_STORAGE_CONNECTION_STRING_PLACEHOLDER", $BatchStorageConnectionString
    $tstParams = $tstParams -replace "TST_STORAGE_CONNECTION_STRING_PLACEHOLDER", $TstStorageConnectionString
    
    # Write to temporary file
    $tstParams | Out-File ".\temp-tst-params.json" -Encoding utf8
    
    Write-Host "TST parameters prepared: temp-tst-params.json"
}

# Prepare PRD environment
if ($Environment -eq "prd" -or $Environment -eq "all") {
    Write-Host "Preparing PRD environment parameters..."
    
    # If prd storage connection string wasn't provided, prompt for it
    if (-not $PrdStorageConnectionString) {
        $PrdStorageConnectionString = Read-Host "Enter the PRD storage connection string"
    }
    
    # Read the parameter file
    $prdParams = Get-Content $prdParamsFile -Raw
    
    # Replace placeholders
    $prdParams = $prdParams -replace "BATCH_STORAGE_CONNECTION_STRING_PLACEHOLDER", $BatchStorageConnectionString
    $prdParams = $prdParams -replace "PRD_STORAGE_CONNECTION_STRING_PLACEHOLDER", $PrdStorageConnectionString
    
    # Write to temporary file
    $prdParams | Out-File ".\temp-prd-params.json" -Encoding utf8
    
    Write-Host "PRD parameters prepared: temp-prd-params.json"
}

Write-Host "Parameter preparation complete. Use the generated temp-*.json files for deployment."
Write-Host "For example: .\deploy-function-nolinux.ps1 -Environment $Environment -ParameterFile temp-$Environment-params.json"
Write-Host ""
Write-Host "IMPORTANT: Delete the temporary files after deployment to avoid storing connection strings on disk."
