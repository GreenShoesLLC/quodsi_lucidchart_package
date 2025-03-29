# Deploy-SingleEnvironment.ps1 (Fixed Version 2)
# This script deploys the Bicep template to a single environment for testing purposes

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
    [switch]$WhatIf,
    
    [Parameter(Mandatory = $false)]
    [switch]$ValidateOnly
)

# Function to log messages with timestamp
function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("Info", "Warning", "Error", "Success", "Debug")]
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $colorMap = @{
        "Info" = "White"
        "Warning" = "Yellow"
        "Error" = "Red"
        "Success" = "Green"
        "Debug" = "Cyan"
    }
    
    Write-Host "[$timestamp] " -NoNewline
    Write-Host "$Message" -ForegroundColor $colorMap[$Level]
}

try {
    # Login to Azure if not already logged in
    $context = Get-AzContext
    if (-not $context) {
        Write-Log "Azure login required. Please log in..." "Info"
        Connect-AzAccount
    }
    else {
        Write-Log "Already logged in as $($context.Account.Id)" "Info"
    }

    # Select subscription
    if ($SubscriptionId) {
        Write-Log "Selecting subscription by ID: $SubscriptionId" "Info"
        Select-AzSubscription -SubscriptionId $SubscriptionId
    }
    elseif ($SubscriptionName) {
        Write-Log "Selecting subscription by name: $SubscriptionName" "Info"
        Select-AzSubscription -SubscriptionName $SubscriptionName
    }

    # Fixed values for naming
    $product = "quodsi"
    $location = "eastus"
    $shortLocation = "eus"  # For eastus
    $instance = "01"
    
    # Generate resource group name
    $rgName = "$Environment-$product-$shortLocation-rg-$instance"
    
    Write-Log "Starting deployment for environment: $Environment" "Info"
    Write-Log "Resource Group: $rgName" "Info"
    
    # Create or update resource group (unless we're just validating)
    if (-not $ValidateOnly) {
        if ($WhatIf) {
            Write-Log "WhatIf: Would create/update Resource Group: $rgName in $location" "Info"
        }
        else {
            Write-Log "Creating/updating Resource Group: $rgName" "Info"
            $rg = New-AzResourceGroup -Name $rgName -Location $location -Force
            Write-Log "Resource Group $($rg.ResourceGroupName) created/updated successfully" "Success"
        }
    }
    else {
        # For validation, check if resource group exists - if not, create it temporarily
        $rgExists = Get-AzResourceGroup -Name $rgName -ErrorAction SilentlyContinue
        if (-not $rgExists) {
            Write-Log "Creating temporary resource group for validation: $rgName" "Info"
            $rg = New-AzResourceGroup -Name $rgName -Location $location -Force
            $removeRgAfterwards = $true
        } else {
            $removeRgAfterwards = $false
        }
    }
    
    # Before proceeding, create a temporary parameter file with all required parameters
    # This is necessary because our template expects parameters that aren't in your current file
    $tempParamFile = "./temp_$Environment.parameters.json"
    
    $completeParams = @{
        '$schema' = "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#"
        'contentVersion' = "1.0.0.0"
        'parameters' = @{
            'environment' = @{ 'value' = $Environment }
            'location' = @{ 'value' = 'eastus' }
            'batchLocation' = @{ 'value' = 'eastus2' }
            'product' = @{ 'value' = 'quodsi' }
            'instance' = @{ 'value' = '01' }
            'version' = @{ 'value' = 'v3' }
        }
    }
    
    $completeParams | ConvertTo-Json -Depth 4 | Set-Content -Path $tempParamFile
    Write-Log "Created temporary parameter file with complete parameters" "Info"
    
    # Deploy or validate Bicep template
    $templateFile = "./combined-template.bicep"
    if (-not (Test-Path $templateFile)) {
        Write-Log "Template file not found: $templateFile" "Error"
        exit 1
    }
    
    if ($ValidateOnly) {
        Write-Log "Validating Bicep template against $Environment environment parameters" "Info"
        
        $validation = Test-AzResourceGroupDeployment -ResourceGroupName $rgName `
            -TemplateFile $templateFile `
            -TemplateParameterFile $tempParamFile `
            -ErrorAction Stop
            
        if ($validation) {
            Write-Log "Template validation failed:" "Error"
            foreach ($error in $validation) {
                Write-Log "- $($error.Message)" "Error"
            }
        } else {
            Write-Log "Template validation successful" "Success"
        }
        
        # If we created a temporary resource group, remove it
        if ($removeRgAfterwards) {
            Write-Log "Removing temporary resource group: $rgName" "Info"
            Remove-AzResourceGroup -Name $rgName -Force
        }
    }
    else {
        if ($WhatIf) {
            Write-Log "WhatIf: Would deploy Bicep template to $Environment environment" "Info"
            # Use What-If operation for detailed change preview
            $whatIfResult = Get-AzResourceGroupDeploymentWhatIfResult -ResourceGroupName $rgName `
                -TemplateFile $templateFile `
                -TemplateParameterFile $tempParamFile
            
            Write-Log "What-If Results:" "Info"
            $whatIfResult | Format-List
        }
        else {
            Write-Log "Deploying Bicep template to $Environment environment" "Info"
            $deployment = New-AzResourceGroupDeployment -ResourceGroupName $rgName `
                -TemplateFile $templateFile `
                -TemplateParameterFile $tempParamFile `
                -ErrorAction Stop
                
            Write-Log "$Environment Environment Deployment Completed Successfully" "Success"
            Write-Log "Deployment Name: $($deployment.DeploymentName)" "Info"
            
            # Output the deployment results
            Write-Log "Deployment Outputs:" "Info"
            foreach ($key in $deployment.Outputs.Keys) {
                Write-Log "- $key : $($deployment.Outputs[$key].Value)" "Info"
            }
        }
    }
    
    # Clean up temporary parameter file
    if (Test-Path $tempParamFile) {
        Remove-Item -Path $tempParamFile -Force
        Write-Log "Removed temporary parameter file" "Info"
    }
    
    Write-Log "Operation completed successfully" "Success"
}
catch {
    Write-Log "An error occurred:" "Error"
    Write-Log "$($_.Exception.Message)" "Error"
    Write-Log "Stack Trace: $($_.ScriptStackTrace)" "Error"
    exit 1
}