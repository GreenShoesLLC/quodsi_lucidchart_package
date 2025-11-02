# Convert-ToArm.ps1
# This script handles converting Bicep to ARM templates or using existing ARM templates

# Import common functions
. $PSScriptRoot\Common-Functions.ps1

# Function to prepare the template for deployment
function Convert-ToArm {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TemplateFile,
        
        [Parameter(Mandatory = $false)]
        [string]$OutputArmFile = ""
    )
    
    try {
        # Check if the template file exists
        if (-not (Test-Path $TemplateFile)) {
            Write-Log "Template file not found: $TemplateFile" "Error"
            return @{
                Success = $false
                ErrorMessage = "Template file not found: $TemplateFile"
            }
        }
        
        # If no output file specified, create a temporary one
        if ([string]::IsNullOrEmpty($OutputArmFile)) {
            $timestamp = Get-Date -Format "yyyyMMddHHmmss"
            $OutputArmFile = [System.IO.Path]::Combine(
                [System.IO.Path]::GetDirectoryName($TemplateFile),
                "arm_" + [System.IO.Path]::GetFileNameWithoutExtension($TemplateFile) + "_$timestamp.json"
            )
        }
        
        # Check file extension
        $extension = [System.IO.Path]::GetExtension($TemplateFile).ToLower()
        
        # Handle different file types
        if ($extension -eq ".bicep") {
            Write-Log "Detected Bicep template" "Info"
            
            # Try to use Azure CLI to convert Bicep to ARM
            try {
                Write-Log "Attempting to convert Bicep to ARM using Azure CLI" "Info"
                az bicep build --file $TemplateFile --outfile $OutputArmFile 2>&1
                
                if ($LASTEXITCODE -eq 0 -and (Test-Path $OutputArmFile)) {
                    Write-Log "Successfully converted Bicep to ARM template" "Success"
                    return @{
                        Success = $true
                        ArmTemplatePath = $OutputArmFile
                        IsConverted = $true
                    }
                }
                else {
                    Write-Log "Azure CLI Bicep conversion failed" "Warning"
                    # Fall back to alternative method
                }
            }
            catch {
                Write-Log "Error using Azure CLI for Bicep conversion: $($_.Exception.Message)" "Warning"
                # Fall back to alternative method
            }
            
            # Last resort: Convert to JSON with a placeholder template
            Write-Log "Could not convert Bicep to ARM template. A placeholder template will be used instead." "Warning"
            Write-Log "To deploy the real template, install Azure CLI with Bicep extension using:" "Warning"
            Write-Log "  > winget install -e --id Microsoft.AzureCLI" "Warning"
            Write-Log "  > az bicep install" "Warning"
            
            $placeholderTemplate = @{}
            $placeholderTemplate['$schema'] = "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#"
            $placeholderTemplate['contentVersion'] = "1.0.0.0"
            $placeholderTemplate['parameters'] = @{}
            $placeholderTemplate['parameters']['environment'] = @{
                "type" = "string"
                "defaultValue" = "dev"
                "allowedValues" = @("dev", "tst", "prd")
            }
            $placeholderTemplate['parameters']['location'] = @{
                "type" = "string"
                "defaultValue" = "eastus"
            }
            $placeholderTemplate['parameters']['product'] = @{
                "type" = "string"
                "defaultValue" = "quodsi"
            }
            $placeholderTemplate['resources'] = @()
            $placeholderTemplate['outputs'] = @{
                "message" = @{
                    "type" = "string"
                    "value" = "This is a placeholder template. Install Bicep to properly convert the Bicep file."
                }
            }
            
            $placeholderTemplate | ConvertTo-Json -Depth 10 | Set-Content -Path $OutputArmFile
            
            return @{
                Success = $false
                ArmTemplatePath = $OutputArmFile
                IsConverted = $false
                ErrorMessage = "Bicep conversion failed. Using placeholder template instead."
            }
        }
        elseif ($extension -eq ".json") {
            # Already an ARM template, just validate it's a proper template
            Write-Log "Detected ARM template, validating format" "Info"
            
            try {
                $templateContent = Get-Content -Path $TemplateFile -Raw | ConvertFrom-Json
                
                # Check if it has the ARM template schema
                if ($templateContent.'$schema' -match 'deploymentTemplate.json') {
                    Write-Log "Valid ARM template detected" "Success"
                    
                    # Copy to output path if different from source
                    if ($TemplateFile -ne $OutputArmFile) {
                        Copy-Item -Path $TemplateFile -Destination $OutputArmFile -Force
                    }
                    
                    return @{
                        Success = $true
                        ArmTemplatePath = $OutputArmFile
                        IsConverted = $false
                    }
                }
                else {
                    Write-Log "JSON file does not appear to be a valid ARM template (schema not found)" "Error"
                    return @{
                        Success = $false
                        ErrorMessage = "JSON file does not have a valid ARM template schema"
                    }
                }
            }
            catch {
                Write-Log "Error validating JSON template: $($_.Exception.Message)" "Error"
                return @{
                    Success = $false
                    ErrorMessage = "Error validating JSON template: $($_.Exception.Message)"
                }
            }
        }
        else {
            Write-Log "Unsupported template file type: $extension" "Error"
            return @{
                Success = $false
                ErrorMessage = "Unsupported template file type: $extension. Expected .bicep or .json"
            }
        }
    }
    catch {
        Write-Log "Error converting template: $($_.Exception.Message)" "Error"
        return @{
            Success = $false
            ErrorMessage = $_.Exception.Message
        }
    }
}

# No Export-ModuleMember for regular scripts