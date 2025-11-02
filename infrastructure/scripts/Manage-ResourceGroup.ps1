# Manage-ResourceGroup.ps1
# This script handles resource group operations

# Import common functions
. $PSScriptRoot\Common-Functions.ps1

# Function to manage resource groups
function Manage-ResourceGroup {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$Location,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("Create", "Validate", "WhatIf")]
        [string]$Operation = "Create",
        
        [Parameter(Mandatory = $false)]
        [switch]$Force = $false
    )
    
    try {
        # Check if resource group exists
        $rgExists = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
        
        switch ($Operation) {
            "Create" {
                if ($rgExists) {
                    Write-Log "Resource Group '$ResourceGroupName' already exists" "Info"
                    if ($Force) {
                        Write-Log "Updating Resource Group properties" "Info"
                        $rg = Set-AzResourceGroup -Name $ResourceGroupName -Location $Location
                        Write-Log "Resource Group updated successfully" "Success"
                    }
                } else {
                    Write-Log "Creating Resource Group: $ResourceGroupName in $Location" "Info"
                    $rg = New-AzResourceGroup -Name $ResourceGroupName -Location $Location -Force:$Force
                    Write-Log "Resource Group created successfully" "Success"
                }
                return @{
                    Success = $true
                    ResourceGroup = $rg
                    WasCreated = (-not $rgExists)
                }
            }
            
            "Validate" {
                if (-not $rgExists) {
                    Write-Log "Creating temporary Resource Group for validation: $ResourceGroupName" "Info"
                    $rg = New-AzResourceGroup -Name $ResourceGroupName -Location $Location -Force:$Force
                    return @{
                        Success = $true
                        ResourceGroup = $rg
                        IsTemporary = $true
                    }
                } else {
                    Write-Log "Using existing Resource Group for validation: $ResourceGroupName" "Info"
                    return @{
                        Success = $true
                        ResourceGroup = $rgExists
                        IsTemporary = $false
                    }
                }
            }
            
            "WhatIf" {
                Write-Log "WhatIf: Would create/update Resource Group: $ResourceGroupName in $Location" "Info"
                return @{
                    Success = $true
                    WhatIf = $true
                    ResourceGroupName = $ResourceGroupName
                    Location = $Location
                }
            }
            
            default {
                throw "Invalid operation: $Operation"
            }
        }
    }
    catch {
        Write-Log "Error managing Resource Group: $($_.Exception.Message)" "Error"
        return @{
            Success = $false
            ErrorMessage = $_.Exception.Message
        }
    }
}

# Function to remove a resource group if it's temporary
function Remove-TemporaryResourceGroup {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $false)]
        [switch]$Force = $false
    )
    
    try {
        Write-Log "Removing temporary Resource Group: $ResourceGroupName" "Info"
        Remove-AzResourceGroup -Name $ResourceGroupName -Force:$Force
        Write-Log "Resource Group removed successfully" "Success"
        return $true
    }
    catch {
        Write-Log "Error removing Resource Group: $($_.Exception.Message)" "Error"
        return $false
    }
}

# No Export-ModuleMember for regular scripts