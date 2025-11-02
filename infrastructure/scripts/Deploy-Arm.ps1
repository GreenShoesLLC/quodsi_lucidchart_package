# Deploy-Arm.ps1
# This script handles ARM template deployment

# Import common functions
. $PSScriptRoot\Common-Functions.ps1

# Validate ARM template
function Test-ArmDeployment {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$TemplateFile,
        
        [Parameter(Mandatory = $true)]
        [string]$ParameterFile
    )
    
    try {
        Write-Log "Validating ARM template" "Info"
        Write-Log "Resource Group: $ResourceGroupName" "Info"
        Write-Log "Template File: $TemplateFile" "Info"
        Write-Log "Parameter File: $ParameterFile" "Info"
        
        # Use Test-AzResourceGroupDeployment to validate
        $validation = Test-AzResourceGroupDeployment -ResourceGroupName $ResourceGroupName `
            -TemplateFile $TemplateFile `
            -TemplateParameterFile $ParameterFile `
            -ErrorAction Stop
            
        if ($validation) {
            Write-Log "Template validation failed:" "Error"
            foreach ($error in $validation) {
                Write-Log "- $($error.Message)" "Error"
            }
            
            return @{
                Success = $false
                ErrorMessages = $validation | ForEach-Object { $_.Message }
            }
        }
        else {
            Write-Log "Template validation successful" "Success"
            return @{
                Success = $true
            }
        }
    }
    catch {
        Write-Log "Error validating ARM template: $($_.Exception.Message)" "Error"
        return @{
            Success = $false
            ErrorMessage = $_.Exception.Message
        }
    }
}

# Get deployment what-if result
function Show-ArmWhatIf {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$TemplateFile,
        
        [Parameter(Mandatory = $true)]
        [string]$ParameterFile
    )
    
    try {
        Write-Log "Running What-If deployment analysis" "Info"
        Write-Log "Resource Group: $ResourceGroupName" "Info"
        Write-Log "Template File: $TemplateFile" "Info"
        Write-Log "Parameter File: $ParameterFile" "Info"
        
        # Use Get-AzResourceGroupDeploymentWhatIfResult for what-if analysis
        $whatIfResult = Get-AzResourceGroupDeploymentWhatIfResult -ResourceGroupName $ResourceGroupName `
            -TemplateFile $TemplateFile `
            -TemplateParameterFile $ParameterFile
            
        Write-Log "What-If Results:" "Info"
        
        # Display a summary of the changes
        $createCount = ($whatIfResult.Changes | Where-Object { $_.ChangeType -eq 'Create' }).Count
        $modifyCount = ($whatIfResult.Changes | Where-Object { $_.ChangeType -eq 'Modify' }).Count
        $deleteCount = ($whatIfResult.Changes | Where-Object { $_.ChangeType -eq 'Delete' }).Count
        $noChangeCount = ($whatIfResult.Changes | Where-Object { $_.ChangeType -eq 'NoChange' }).Count
        
        Write-Log "Summary of changes:" "Info"
        Write-Log "- Create: $createCount resource(s)" "Info"
        Write-Log "- Modify: $modifyCount resource(s)" "Info"
        Write-Log "- Delete: $deleteCount resource(s)" "Info"
        Write-Log "- No Change: $noChangeCount resource(s)" "Info"
        
        # Display detailed changes
        if ($whatIfResult.Changes.Count -gt 0) {
            Write-Log "Detailed Changes:" "Info"
            foreach ($change in $whatIfResult.Changes) {
                $color = switch ($change.ChangeType) {
                    'Create' { 'Green' }
                    'Modify' { 'Yellow' }
                    'Delete' { 'Red' }
                    default { 'White' }
                }
                
                Write-Host "  [$($change.ChangeType)] " -ForegroundColor $color -NoNewline
                Write-Host "$($change.ResourceId)"
                
                if ($change.Delta -and $change.Delta.Count -gt 0) {
                    foreach ($delta in $change.Delta) {
                        Write-Host "    - Property: $($delta.PropertyName)" -ForegroundColor Cyan
                        Write-Host "      From: $($delta.PropertyChangeType.ToString())" -ForegroundColor Gray
                        Write-Host "      To: $($delta.After)" -ForegroundColor Gray
                    }
                }
            }
        }
        
        return @{
            Success = $true
            WhatIfResult = $whatIfResult
        }
    }
    catch {
        Write-Log "Error running What-If analysis: $($_.Exception.Message)" "Error"
        return @{
            Success = $false
            ErrorMessage = $_.Exception.Message
        }
    }
}

# Execute deployment
function Start-ArmDeployment {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$TemplateFile,
        
        [Parameter(Mandatory = $true)]
        [string]$ParameterFile,
        
        [Parameter(Mandatory = $false)]
        [string]$DeploymentName = ""
    )
    
    try {
        # Generate deployment name if not provided
        if ([string]::IsNullOrEmpty($DeploymentName)) {
            $timestamp = Get-Date -Format "yyyyMMddHHmmss"
            $DeploymentName = "deploy-$timestamp"
        }
        
        Write-Log "Starting ARM template deployment" "Info"
        Write-Log "Deployment Name: $DeploymentName" "Info"
        Write-Log "Resource Group: $ResourceGroupName" "Info"
        Write-Log "Template File: $TemplateFile" "Info"
        Write-Log "Parameter File: $ParameterFile" "Info"
        
        # Use New-AzResourceGroupDeployment to deploy
        $deployment = New-AzResourceGroupDeployment -Name $DeploymentName `
            -ResourceGroupName $ResourceGroupName `
            -TemplateFile $TemplateFile `
            -TemplateParameterFile $ParameterFile `
            -ErrorAction Stop
            
        Write-Log "Deployment completed successfully" "Success"
        
        # Display deployment outputs
        if ($deployment.Outputs -and $deployment.Outputs.Count -gt 0) {
            Write-Log "Deployment Outputs:" "Info"
            foreach ($key in $deployment.Outputs.Keys) {
                Write-Log "- $key : $($deployment.Outputs[$key].Value)" "Info"
            }
        }
        
        return @{
            Success = $true
            Deployment = $deployment
        }
    }
    catch {
        Write-Log "Error executing deployment: $($_.Exception.Message)" "Error"
        return @{
            Success = $false
            ErrorMessage = $_.Exception.Message
        }
    }
}

# No Export-ModuleMember for regular scripts