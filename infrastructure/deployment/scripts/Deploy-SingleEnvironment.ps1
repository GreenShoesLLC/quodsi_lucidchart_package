# Deploy-SingleEnvironment.ps1
# Simplified script for deploying a single environment

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "tst", "prd")]
    [string]$Environment,
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("Validate", "Deploy", "WhatIf")]
    [string]$Mode = "Validate",
    
    [Parameter(Mandatory = $false)]
    [string]$SubscriptionName = "Microsoft Azure Sponsorship",
    
    [Parameter(Mandatory = $false)]
    [string]$TemplateFile = "..\complete\minimal-template.json",
    
    [Parameter(Mandatory = $false)]
    [string]$ParameterFile = ""
)

# Build the command line with proper parameter syntax
$cmd = "& '$PSScriptRoot\Deploy-Environment.ps1'"
$cmd += " -Environment $Environment"
$cmd += " -SubscriptionName '$SubscriptionName'"
$cmd += " -TemplateFile '$TemplateFile'"

# Add parameter file if specified
if (-not [string]::IsNullOrEmpty($ParameterFile)) {
    $cmd += " -ParameterFile '$ParameterFile'"
}

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

# Display the command being executed
Write-Host "Executing: $cmd" -ForegroundColor Cyan

# Execute the command
Invoke-Expression $cmd