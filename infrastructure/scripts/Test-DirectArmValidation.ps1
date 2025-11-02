# Test-DirectArmValidation.ps1
# Direct validation bypassing the scripts

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory = $false)]
    [string]$TemplateFile = "..\storage\storage-only.json",
    
    [Parameter(Mandatory = $false)]
    [string]$ParameterFile = "..\storage\storage-params.json"
)

Write-Host "Ensuring resource group exists..." -ForegroundColor Cyan
$rg = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
if (-not $rg) {
    Write-Host "Creating resource group $ResourceGroupName" -ForegroundColor Yellow
    $rg = New-AzResourceGroup -Name $ResourceGroupName -Location "eastus" -ErrorAction Stop
}

try {
    Write-Host "Loading template and parameters..." -ForegroundColor Cyan
    $template = Get-Content -Path $TemplateFile -Raw
    $params = Get-Content -Path $ParameterFile -Raw | ConvertFrom-Json
    
    # Create parameter object
    $paramObject = @{}
    foreach ($param in $params.parameters.PSObject.Properties) {
        $paramObject[$param.Name] = $param.Value.value
    }
    
    Write-Host "Parameters:" -ForegroundColor Cyan
    $paramObject | Format-Table -AutoSize
    
    Write-Host "Validating template with expanded debug info..." -ForegroundColor Cyan
    $ErrorActionPreference = "Continue"
    $DebugPreference = "Continue"
    $VerbosePreference = "Continue"
    
    # Test deployment
    Write-Host "Running Test-AzResourceGroupDeployment..." -ForegroundColor Cyan
    $result = Test-AzResourceGroupDeployment `
        -ResourceGroupName $ResourceGroupName `
        -TemplateFile $TemplateFile `
        -TemplateParameterObject $paramObject `
        -Debug `
        -Verbose
    
    if ($result) {
        Write-Host "Validation failed with errors:" -ForegroundColor Red
        $result | Format-List *
        
        if ($result.Details) {
            Write-Host "Error Details:" -ForegroundColor Red
            $result.Details | Format-List *
        }
        
        if ($result.Details.Message) {
            Write-Host "Inner error message:" -ForegroundColor Red
            $result.Details.Message
        }
    } else {
        Write-Host "Template validation SUCCESSFUL" -ForegroundColor Green
        
        # Try a what-if deployment
        Write-Host "Running Get-AzResourceGroupDeploymentWhatIfResult..." -ForegroundColor Cyan
        $whatIf = Get-AzResourceGroupDeploymentWhatIfResult `
            -ResourceGroupName $ResourceGroupName `
            -TemplateFile $TemplateFile `
            -TemplateParameterObject $paramObject
            
        Write-Host "What-If Results:" -ForegroundColor Cyan
        $whatIf.Changes | Format-Table ResourceId, ChangeType -AutoSize
    }
}
catch {
    Write-Host "Error occurred during validation:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.InnerException) {
        Write-Host "Inner exception: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
    
    if ($_.ErrorDetails) {
        Write-Host "Error details: $($_.ErrorDetails)" -ForegroundColor Red
    }
    
    # Try to access response content if available
    if ($_.Exception.Response -and $_.Exception.Response.Content) {
        Write-Host "Response content: $($_.Exception.Response.Content)" -ForegroundColor Red
    }
}