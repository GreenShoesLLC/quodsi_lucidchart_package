# Manage-Parameters.ps1
# This script helps manage ARM template parameters

# Import common functions
. $PSScriptRoot\Common-Functions.ps1

# Create a complete parameter file from a minimal one or from scratch
function Expand-ParameterFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        
        [Parameter(Mandatory = $false)]
        [string]$InputParameterFile = "",
        
        [Parameter(Mandatory = $false)]
        [string]$OutputParameterFile = "",
        
        [Parameter(Mandatory = $false)]
        [string]$Location = "eastus",
        
        [Parameter(Mandatory = $false)]
        [string]$BatchLocation = "eastus2",
        
        [Parameter(Mandatory = $false)]
        [string]$Product = "quodsi",
        
        [Parameter(Mandatory = $false)]
        [string]$Instance = "01",
        
        [Parameter(Mandatory = $false)]
        [string]$Version = "v3"
    )
    
    try {
        # Initialize parameter object
        $parameterObject = @{
            '$schema' = "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#"
            'contentVersion' = "1.0.0.0"
            'parameters' = @{
                'environment' = @{ 'value' = $Environment }
                'location' = @{ 'value' = $Location }
                'batchLocation' = @{ 'value' = $BatchLocation }
                'product' = @{ 'value' = $Product }
                'instance' = @{ 'value' = $Instance }
                'version' = @{ 'value' = $Version }
            }
        }
        
        # If input parameter file provided, read and merge with default values
        if (-not [string]::IsNullOrEmpty($InputParameterFile) -and (Test-Path $InputParameterFile)) {
            Write-Log "Reading existing parameter file: $InputParameterFile" "Info"
            $existingParams = Get-Content -Path $InputParameterFile -Raw | ConvertFrom-Json
            
            # If parameters property exists, merge with defaults
            if ($existingParams.PSObject.Properties.Name -contains "parameters") {
                foreach ($paramName in $existingParams.parameters.PSObject.Properties.Name) {
                    if ($existingParams.parameters.$paramName.PSObject.Properties.Name -contains "value") {
                        $paramValue = $existingParams.parameters.$paramName.value
                        Write-Log "Using existing parameter: $paramName = $paramValue" "Debug"
                        $parameterObject.parameters[$paramName] = @{ 'value' = $paramValue }
                    }
                }
            }
        }
        
        # Determine output file path
        if ([string]::IsNullOrEmpty($OutputParameterFile)) {
            $timestamp = Get-Date -Format "yyyyMMddHHmmss"
            $OutputParameterFile = "$Environment-parameters-$timestamp.json"
        }
        
        # Write the parameter file
        $parameterObject | ConvertTo-Json -Depth 10 | Set-Content -Path $OutputParameterFile
        Write-Log "Created complete parameter file: $OutputParameterFile" "Success"
        
        return @{
            Success = $true
            ParameterFile = $OutputParameterFile
        }
    }
    catch {
        Write-Log "Error creating parameter file: $($_.Exception.Message)" "Error"
        return @{
            Success = $false
            ErrorMessage = $_.Exception.Message
        }
    }
}

# Generate parameter files for all environments
function New-EnvironmentParameterFiles {
    param(
        [Parameter(Mandatory = $false)]
        [string[]]$Environments = @("dev", "tst", "prd"),
        
        [Parameter(Mandatory = $false)]
        [string]$OutputDirectory = ".",
        
        [Parameter(Mandatory = $false)]
        [switch]$Force
    )
    
    try {
        # Make sure output directory exists
        if (-not (Test-Path $OutputDirectory)) {
            New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
        }
        
        $results = @()
        
        foreach ($env in $Environments) {
            $outputFile = Join-Path $OutputDirectory "$env.parameters.json"
            
            # Skip if file exists and Force not specified
            if ((Test-Path $outputFile) -and (-not $Force)) {
                Write-Log "Parameter file already exists: $outputFile. Use -Force to overwrite." "Warning"
                $results += @{
                    Environment = $env
                    Success = $false
                    ErrorMessage = "File already exists"
                    ParameterFile = $outputFile
                }
                continue
            }
            
            # Create parameter file
            $result = Expand-ParameterFile -Environment $env -OutputParameterFile $outputFile
            
            if ($result.Success) {
                $results += @{
                    Environment = $env
                    Success = $true
                    ParameterFile = $outputFile
                }
            }
            else {
                $results += @{
                    Environment = $env
                    Success = $false
                    ErrorMessage = $result.ErrorMessage
                    ParameterFile = $outputFile
                }
            }
        }
        
        return $results
    }
    catch {
        Write-Log "Error creating environment parameter files: $($_.Exception.Message)" "Error"
        return @{
            Success = $false
            ErrorMessage = $_.Exception.Message
        }
    }
}

# No Export-ModuleMember for regular scripts