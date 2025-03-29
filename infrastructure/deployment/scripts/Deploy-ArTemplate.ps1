# Deploy-ArTemplate.ps1
# Helper script to deploy using ARM JSON template directly

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "tst", "prd")]
    [string]$Environment,
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("Validate", "Deploy", "WhatIf")]
    [string]$Mode = "Validate",
    
    [Parameter(Mandatory = $false)]
    [string]$TemplateFile = "..\complete\existing-resources.json",
    
    [Parameter(Mandatory = $false)]
    [string]$ParameterFile = "",
    
    [Parameter(Mandatory = $false)]
    [string]$SubscriptionName = "Microsoft Azure Sponsorship"
)

# Make sure we're using a JSON template file
if (-not (Test-Path $TemplateFile)) {
    Write-Host "Template file not found: $TemplateFile" -ForegroundColor Red
    exit 1
}

$fileExtension = [System.IO.Path]::GetExtension($TemplateFile).ToLower()
if ($fileExtension -ne ".json") {
    Write-Host "This script only works with .json ARM templates" -ForegroundColor Red
    Write-Host "Please specify a JSON template file using -TemplateFile parameter" -ForegroundColor Yellow
    exit 1
}

# Run the deployment using the JSON ARM template
Write-Host "Starting $Mode operation for $Environment environment using ARM JSON template" -ForegroundColor Green

if ([string]::IsNullOrEmpty($ParameterFile)) {
    & "$PSScriptRoot\Deploy-SingleEnvironment.ps1" -Environment $Environment -Mode $Mode -SubscriptionName $SubscriptionName -TemplateFile $TemplateFile
} else {
    # Use Deploy-Environment.ps1 directly to specify the parameter file
    $cmd = "& '$PSScriptRoot\Deploy-Environment.ps1'"
    $cmd += " -Environment $Environment"
    $cmd += " -SubscriptionName '$SubscriptionName'"
    $cmd += " -TemplateFile '$TemplateFile'"
    $cmd += " -ParameterFile '$ParameterFile'"
    
    # Add appropriate switches based on mode
    switch ($Mode) {
        "Validate" {
            $cmd += " -ValidateOnly"
        }
        "WhatIf" {
            $cmd += " -WhatIf"
        }
        "Deploy" {
            # No additional arguments for deploy mode
        }
    }
    
    Write-Host "Executing: $cmd" -ForegroundColor Cyan
    Invoke-Expression $cmd
}