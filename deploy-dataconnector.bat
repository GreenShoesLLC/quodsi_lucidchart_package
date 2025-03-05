@echo off
setlocal enabledelayedexpansion

echo ===================================
echo Azure Function Deployment Script
echo ===================================

REM Set variables
REM set functionAppName=dev-quodsi-func-lucid-v3-v3
REM set resourceGroup=devquodsifunclucidv3v3

set functionAppName=dev-quodsi-func-lucid-v3
set resourceGroup=dev-quodsi-rg-01
set projectPath=%~dp0dataconnectors\quodsi_data_connector_lucidchart_v2

REM Show settings
echo Function App: %functionAppName%
echo Resource Group: %resourceGroup%
echo Project Path: %projectPath%
echo.

REM Navigate to function app directory
echo Changing to project directory...
cd %projectPath%

REM Clean and rebuild
echo Running clean...
call npm run clean
if %ERRORLEVEL% neq 0 (
    echo Error during clean step!
    goto :error
)

echo Running build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error during build step!
    goto :error
)

REM Deploy
echo Deploying to %functionAppName%...
call func azure functionapp publish %functionAppName% --verbose
if %ERRORLEVEL% neq 0 (
    echo Deployment failed!
    goto :error
)

echo.
echo Deployment completed successfully!
echo.
echo Verifying deployed functions...
call az functionapp function list --name %functionAppName% --resource-group %resourceGroup% -o table

goto :end

:error
echo.
echo Deployment script failed with error level %ERRORLEVEL%
exit /b %ERRORLEVEL%

:end
echo.
echo Returning to original directory...
cd %~dp0
endlocal