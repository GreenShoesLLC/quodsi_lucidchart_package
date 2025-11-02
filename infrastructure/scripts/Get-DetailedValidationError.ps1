# Get-DetailedValidationError.ps1
# Get detailed validation errors for ARM templates

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory = $true)]
    [string]$TemplateFile,
    
    [Parameter(Mandatory = $true)]
    [string]$ParameterFile
)

# Load the parameter file
$params = Get-Content -Path $ParameterFile -Raw | ConvertFrom-Json

# Convert parameter object to hashtable
$paramHash = @{}
foreach ($key in $params.parameters.PSObject.Properties.Name) {
    $paramHash[$key] = $params.parameters.$key.value
}

Write-Host "Using parameters:" -ForegroundColor Cyan
$paramHash | Format-Table -AutoSize

# Get validation results 
Write-Host "Validating template..." -ForegroundColor Cyan
$validationResult = Test-AzResourceGroupDeployment -ResourceGroupName $ResourceGroupName `
    -TemplateFile $TemplateFile `
    -TemplateParameterObject $paramHash `
    -Verbose 4>&1

# Output the results
if ($validationResult) {
    Write-Host "Template validation failed with these errors:" -ForegroundColor Red
    $validationResult | Format-List
} else {
    Write-Host "Template validation successful" -ForegroundColor Green
}
