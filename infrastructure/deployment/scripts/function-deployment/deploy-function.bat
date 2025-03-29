@echo off
setlocal enabledelayedexpansion

REM ===================================
REM Azure Function Deployment Script
REM ===================================

REM Default to dev environment if not specified
if "%~1"=="" (
    set ENV=dev
    echo No environment specified, defaulting to dev
) else (
    set ENV=%~1
    echo Deploying to %ENV% environment
)

REM Set environment-specific variables
if /I "%ENV%"=="dev" (
    set functionAppName=dev-quodsi-func-v1
    set resourceGroup=dev-quodsi-rg-01
) else if /I "%ENV%"=="tst" (
    set functionAppName=tst-quodsi-func-v1
    set resourceGroup=tst-quodsi-rg-01
) else if /I "%ENV%"=="prd" (
    set functionAppName=prd-quodsi-func-v1
    set resourceGroup=prd-quodsi-rg-01
) else (
    echo Error: Invalid environment specified. Use 'dev', 'tst', or 'prd'.
    exit /b 1
)

REM Get the root directory of the project
set rootDir=%~dp0..\..\..\..
set projectPath=%rootDir%\dataconnectors\quodsi_data_connector_lucidchart_v2

REM Show settings
echo ===================================
echo Deployment Settings
echo ===================================
echo Environment: %ENV%
echo Function App: %functionAppName%
echo Resource Group: %resourceGroup%
echo Project Path: %projectPath%
echo.

REM Check if Function App exists
call az functionapp show --name %functionAppName% --resource-group %resourceGroup% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Function App %functionAppName% not found in resource group %resourceGroup%
    echo Make sure the Function App has been deployed with the ARM templates.
    exit /b 1
)

REM Confirm deployment
set /p confirmation=Continue with deployment to %ENV% environment? (Y/N):
if /I "%confirmation%" neq "Y" (
    echo Deployment canceled by user.
    exit /b 0
)

REM Navigate to function app directory
echo.
echo Changing to project directory...
cd %projectPath% || (
    echo Error: Unable to change to directory %projectPath%
    exit /b 1
)

REM Clean and rebuild
echo.
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
echo.
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
cd %rootDir%
exit /b %ERRORLEVEL%

:end
echo.
echo Returning to original directory...
cd %rootDir%
endlocal