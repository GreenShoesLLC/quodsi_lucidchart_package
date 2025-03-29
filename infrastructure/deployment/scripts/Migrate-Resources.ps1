# Migrate-Resources.ps1
# Helper script to extract ARM template from existing resources

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "tst", "prd")]
    [string]$SourceEnvironment,
    
    [Parameter(Mandatory = $false)]
    [string]$OutputPath = "./exported-template.json",
    
    [Parameter(Mandatory = $false)]
    [switch]$IncludeParameterValues = $false
)

# Import common functions
. $PSScriptRoot\Common-Functions.ps1

# Generate the resource group name
$resourceNames = Get-ResourceNames -Environment $SourceEnvironment -Product "quodsi" -Location "eastus" -Instance "01"
$resourceGroupName = $resourceNames.ResourceGroup

# Connect to Azure
Connect-ToAzure

try {
    # Check if the resource group exists
    $rg = Get-AzResourceGroup -Name $resourceGroupName -ErrorAction Stop
    
    Write-Log "Found resource group: $resourceGroupName" "Success"
    
    # Remove .json extension if it's already there
    $baseOutputPath = $OutputPath -replace '\.json$', ''
    
    # Export the ARM template
    Write-Log "Exporting ARM template from existing resources..." "Info"
    
    Export-AzResourceGroup -ResourceGroupName $resourceGroupName -IncludeParameterDefaultValue:$IncludeParameterValues -Path $baseOutputPath
    
    # Check if export was successful - look for the file with the .json extension
    $actualOutputFile = "$baseOutputPath.json"
    if (Test-Path $actualOutputFile) {
        Write-Log "Template exported successfully to $actualOutputFile" "Success"
        
        # If the user specified an explicit filename with the .json extension, rename it
        if ($OutputPath -ne $actualOutputFile -and $OutputPath.EndsWith(".json")) {
            Copy-Item -Path $actualOutputFile -Destination $OutputPath -Force
            Remove-Item -Path $actualOutputFile -Force
            $actualOutputFile = $OutputPath
            Write-Log "Renamed to $OutputPath as requested" "Info"
        }
        
        # Provide info about next steps
        Write-Log "You can now use this template to deploy to other environments." "Info"
        Write-Log "Example: .\Deploy-ArTemplate.ps1 -Environment tst -Mode Validate -TemplateFile $actualOutputFile" "Info"
    } else {
        Write-Log "Export appeared to succeed but could not find output file $actualOutputFile" "Error"
        
        # Look for any JSON files that might have been created
        $createdFiles = Get-ChildItem -Path (Split-Path -Parent $OutputPath) -Filter "*.json" -File
        if ($createdFiles.Count -gt 0) {
            Write-Log "Found these JSON files that might be the exported template:" "Info"
            foreach ($file in $createdFiles) {
                Write-Log " - $($file.FullName)" "Info"
            }
        }
    }
}
catch {
    Write-Log "Error exporting ARM template: $($_.Exception.Message)" "Error"
    exit 1
}