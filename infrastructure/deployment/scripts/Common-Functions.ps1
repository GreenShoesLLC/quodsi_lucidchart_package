# Common-Functions.ps1
# This script contains common functions used by the deployment scripts

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

# Function to ensure we're connected to Azure
function Connect-ToAzure {
    param(
        [Parameter(Mandatory = $false)]
        [string]$SubscriptionId,
        
        [Parameter(Mandatory = $false)]
        [string]$SubscriptionName = "Microsoft Azure Sponsorship"
    )
    
    # Check if already connected
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
}

# Function to generate resource names based on naming convention
function Get-ResourceNames {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        
        [Parameter(Mandatory = $true)]
        [string]$Product,
        
        [Parameter(Mandatory = $true)]
        [string]$Location,
        
        [Parameter(Mandatory = $true)]
        [string]$Instance
    )
    
    # Create short location name
    $shortLocation = switch ($Location.ToLower()) {
        "eastus" { "eus" }
        "eastus2" { "eus2" }
        "westus" { "wus" }
        "westus2" { "wus2" }
        "northeurope" { "neu" }
        "westeurope" { "weu" }
        default {
            # Use first 5 characters for other regions
            $Location.ToLower().Replace(" ", "").Substring(0, [Math]::Min(5, $Location.Length))
        }
    }
    
    # Create resource names
    $resourceNames = @{
        ResourceGroup = "$Environment-$Product-$shortLocation-rg-$Instance"
        FunctionApp = "$Environment-$Product-$shortLocation-func-$Instance"
        AppServicePlan = "$Environment-$Product-$shortLocation-plan-$Instance"
        # Storage account name must be lowercase alphanumeric characters and less than 24 chars
        FunctionStorage = "$($Environment.ToLower())$($Product.ToLower())$($shortLocation.ToLower())st$($Instance.ToLower())"
        BatchAccount = "$Environment-$Product-$shortLocation-batch-$Instance"
        BatchStorage = "$($Environment.ToLower())$($Product.ToLower())$($shortLocation.ToLower())stbatch$($Instance.ToLower())"
        AppInsights = "$Environment-$Product-$shortLocation-ai-$Instance"
        KeyVault = "$Environment-$Product-$shortLocation-kv-$Instance"
    }
    
    return $resourceNames
}

# Function to create a complete parameter file with all required parameters
function New-ParameterFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        
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
        [string]$OutputPath = "./temp_parameters.json"
    )
    
    $completeParams = @{
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
    
    $completeParams | ConvertTo-Json -Depth 4 | Set-Content -Path $OutputPath
    Write-Log "Created parameter file at $OutputPath" "Info"
    
    return $OutputPath
}

# Check if Bicep is installed
function Test-BicepInstalled {
    try {
        # Try Azure CLI bicep version first
        $null = & az --version 2>&1 | Select-String "bicep"
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Bicep is installed via Azure CLI" "Info"
            return $true
        }
        
        # Try bicep command directly
        $null = & bicep --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Bicep standalone is installed" "Info"
            return $true
        }
        
        Write-Log "Bicep is not installed or not in PATH" "Warning"
        return $false
    }
    catch {
        Write-Log "Error checking Bicep installation: $($_.Exception.Message)" "Warning"
        return $false
    }
}

# No Export-ModuleMember for regular scripts