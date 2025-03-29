# Deploy-Environment.ps1
# Master script for environment deployment

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "tst", "prd")]
    [string]$Environment,
    
    [Parameter(Mandatory = $false)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory = $false)]
    [string]$SubscriptionName = "Microsoft Azure Sponsorship",
    
    [Parameter(Mandatory = $false)]
    [string]$TemplateFile = "..\complete\existing-resources.json",
    
    [Parameter(Mandatory = $false)]
    [string]$ParameterFile = "",
    
    [Parameter(Mandatory = $false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory = $false)]
    [string]$BatchLocation = "eastus2",
    
    [Parameter(Mandatory = $false)]
    [string]$Product = "quodsi",
    
    [Parameter(Mandatory = $false)]
    [string]$Instance = "01",
    
    [Parameter(Mandatory = $false)]
    [string]$Version = "v3",
    
    [Parameter(Mandatory = $false)]
    [switch]$ValidateOnly,
    
    [Parameter(Mandatory = $false)]
    [switch]$WhatIf,
    
    [Parameter(Mandatory = $false)]
    [switch]$Force,
    
    [Parameter(Mandatory = $false)]
    [string]$TempDirectory = [System.IO.Path]::GetTempPath()
)

# Import helper scripts
. $PSScriptRoot\Common-Functions.ps1
. $PSScriptRoot\Manage-ResourceGroup.ps1
. $PSScriptRoot\Deploy-Arm.ps1
. $PSScriptRoot\Manage-Parameters.ps1

# Create timestamp for uniqueness
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

function Start-Deployment {
    try {
        Write-Log "Starting deployment process for $Environment environment" "Info"
        
        # Step 1: Connect to Azure
        Write-Log "Connecting to Azure..." "Info"
        Connect-ToAzure -SubscriptionId $SubscriptionId -SubscriptionName $SubscriptionName
        
        # Step 2: Generate resource names based on naming convention
        Write-Log "Generating resource names..." "Info"
        $resourceNames = Get-ResourceNames -Environment $Environment -Product $Product -Location $Location -Instance $Instance
        $rgName = $resourceNames.ResourceGroup
        
        # Step 3: Prepare parameter file if not provided
        Write-Log "Preparing parameter file..." "Info"
        $tempParameterFile = $null
        
        if ([string]::IsNullOrEmpty($ParameterFile)) {
            # Check for environment-specific parameter file in script directory
            $envParamFile = Join-Path $PSScriptRoot "$Environment.parameters.json"
            $completeParamFile = Join-Path "$PSScriptRoot\..\complete" "$Environment.parameters.json"
            
            if (Test-Path $envParamFile) {
                $ParameterFile = $envParamFile
                Write-Log "Using parameter file from script directory: $ParameterFile" "Info"
            } elseif (Test-Path $completeParamFile) {
                $ParameterFile = $completeParamFile
                Write-Log "Using parameter file from complete directory: $ParameterFile" "Info"
            } else {
                # Create temporary parameter file
                Write-Log "Creating temporary parameter file..." "Info"
                $tempParameterFileName = Join-Path $TempDirectory "temp_$Environment-parameters-$timestamp.json"
                $paramResult = Expand-ParameterFile -Environment $Environment `
                    -Location $Location -BatchLocation $BatchLocation `
                    -Product $Product -Instance $Instance -Version $Version `
                    -OutputParameterFile $tempParameterFileName
                
                if (-not $paramResult.Success) {
                    throw "Failed to create parameter file: $($paramResult.ErrorMessage)"
                }
                
                $ParameterFile = $paramResult.ParameterFile
                $tempParameterFile = $ParameterFile  # Save for cleanup
                Write-Log "Created parameter file: $ParameterFile" "Success"
            }
        }
        
        # Step 4: Ensure template file exists
        if (-not (Test-Path $TemplateFile)) {
            throw "Template file not found: $TemplateFile"
        }
        
        # Step 5: Manage resource group
        Write-Log "Managing resource group..." "Info"
        $operation = if ($WhatIf) { "WhatIf" } elseif ($ValidateOnly) { "Validate" } else { "Create" }
        $rgResult = Manage-ResourceGroup -ResourceGroupName $rgName -Location $Location -Operation $operation -Force:$Force
        
        if (-not $rgResult.Success) {
            throw "Failed to manage resource group: $($rgResult.ErrorMessage)"
        }
        
        $isTemporaryRg = $false
        if ($rgResult.IsTemporary) {
            $isTemporaryRg = $true
            Write-Log "Created temporary resource group for validation" "Info"
        }
        
        # Step 6: Convert template to ARM if it's a Bicep file
        Write-Log "Preparing deployment template..." "Info"
        $templateExtension = [System.IO.Path]::GetExtension($TemplateFile).ToLower()
        $tempArmTemplate = $null
        
        if ($templateExtension -eq ".bicep") {
            $tempArmTemplate = Join-Path $TempDirectory "arm_template_$timestamp.json"
            
            # Source the Convert-ToArm function directly
            . $PSScriptRoot\Convert-ToArm.ps1
            
            $templateResult = Convert-ToArm -TemplateFile $TemplateFile -OutputArmFile $tempArmTemplate
            
            if (-not $templateResult.Success) {
                if ($isTemporaryRg) {
                    Remove-TemporaryResourceGroup -ResourceGroupName $rgName -Force
                }
                
                if ($tempParameterFile -and (Test-Path $tempParameterFile)) {
                    Remove-Item -Path $tempParameterFile -Force
                }
                
                throw "Failed to convert Bicep template: $($templateResult.ErrorMessage)"
            }
            
            $deploymentTemplate = $templateResult.ArmTemplatePath
            Write-Log "Using ARM template: $deploymentTemplate" "Info"
        } else {
            $deploymentTemplate = $TemplateFile
            Write-Log "Using existing template: $deploymentTemplate" "Info"
        }
        
        # Step 7: Execute the appropriate action based on parameters
        if ($ValidateOnly) {
            # Validate the template
            Write-Log "Validating deployment..." "Info"
            $validationResult = Test-ArmDeployment -ResourceGroupName $rgName -TemplateFile $deploymentTemplate -ParameterFile $ParameterFile
            
            if ($validationResult.Success) {
                Write-Log "Validation completed successfully" "Success"
                $finalResult = @{
                    Success = $true
                    Operation = "Validate"
                    Message = "Template validation successful"
                }
            }
            else {
                $errorMessages = if ($validationResult.ErrorMessages) {
                    $validationResult.ErrorMessages -join "; "
                } elseif ($validationResult.ErrorMessage) {
                    $validationResult.ErrorMessage
                } else {
                    "Unknown validation error"
                }
                
                Write-Log "Validation failed: $errorMessages" "Error"
                $finalResult = @{
                    Success = $false
                    Operation = "Validate"
                    Message = "Template validation failed"
                    ErrorMessage = $errorMessages
                }
            }
        }
        elseif ($WhatIf) {
            # Get what-if results
            Write-Log "Performing What-If analysis..." "Info"
            $whatIfResult = Show-ArmWhatIf -ResourceGroupName $rgName -TemplateFile $deploymentTemplate -ParameterFile $ParameterFile
            
            if ($whatIfResult.Success) {
                Write-Log "What-If analysis completed successfully" "Success"
                $finalResult = @{
                    Success = $true
                    Operation = "WhatIf"
                    Message = "What-If analysis successful"
                    WhatIfResult = $whatIfResult.WhatIfResult
                }
            }
            else {
                Write-Log "What-If analysis failed: $($whatIfResult.ErrorMessage)" "Error"
                $finalResult = @{
                    Success = $false
                    Operation = "WhatIf"
                    Message = "What-If analysis failed"
                    ErrorMessage = $whatIfResult.ErrorMessage
                }
            }
        }
        else {
            # Execute the deployment
            Write-Log "Executing deployment..." "Info"
            $deploymentName = "$Environment-deployment-$timestamp"
            $deploymentResult = Start-ArmDeployment -ResourceGroupName $rgName -TemplateFile $deploymentTemplate -ParameterFile $ParameterFile -DeploymentName $deploymentName
            
            if ($deploymentResult.Success) {
                Write-Log "$Environment environment deployment completed successfully" "Success"
                $finalResult = @{
                    Success = $true
                    Operation = "Deploy"
                    Message = "Deployment successful"
                    Deployment = $deploymentResult.Deployment
                }
            }
            else {
                Write-Log "Deployment failed: $($deploymentResult.ErrorMessage)" "Error"
                $finalResult = @{
                    Success = $false
                    Operation = "Deploy"
                    Message = "Deployment failed"
                    ErrorMessage = $deploymentResult.ErrorMessage
                }
            }
        }
        
        # Step 8: Clean up temporary resources
        if ($isTemporaryRg) {
            Write-Log "Cleaning up temporary resource group..." "Info"
            Remove-TemporaryResourceGroup -ResourceGroupName $rgName -Force
        }
        
        if ($tempParameterFile -and (Test-Path $tempParameterFile)) {
            Write-Log "Cleaning up temporary parameter file..." "Info"
            Remove-Item -Path $tempParameterFile -Force
        }
        
        if ($tempArmTemplate -and (Test-Path $tempArmTemplate)) {
            Write-Log "Cleaning up temporary ARM template..." "Info"
            Remove-Item -Path $tempArmTemplate -Force
        }
        
        # Return final result
        return $finalResult
    }
    catch {
        Write-Log "Deployment process failed with error:" "Error"
        Write-Log "$($_.Exception.Message)" "Error"
        if ($_.ScriptStackTrace) {
            Write-Log "Stack Trace: $($_.ScriptStackTrace)" "Error"
        }
        
        # Clean up temporary resources on error
        if ($isTemporaryRg) {
            Remove-TemporaryResourceGroup -ResourceGroupName $rgName -Force
        }
        
        if ($tempParameterFile -and (Test-Path $tempParameterFile)) {
            Remove-Item -Path $tempParameterFile -Force
        }
        
        if ($tempArmTemplate -and (Test-Path $tempArmTemplate)) {
            Remove-Item -Path $tempArmTemplate -Force
        }
        
        return @{
            Success = $false
            Operation = "Unknown"
            Message = "Deployment process failed"
            ErrorMessage = $_.Exception.Message
        }
    }
}

# Execute deployment
$result = Start-Deployment

# Return result code for automation
if ($result.Success) {
    exit 0
} else {
    exit 1
}