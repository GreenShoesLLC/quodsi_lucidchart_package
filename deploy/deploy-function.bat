@echo off
REM This is a convenience wrapper for the deployment script
REM Usage: deploy-function.bat [environment]
REM   environment: dev (default), tst, prd

set ENV=%1

REM Call the actual deployment script (PowerShell)
powershell -ExecutionPolicy Bypass -File "%~dp0azure-functions\deploy-function-code.ps1" -Environment %ENV%

REM Preserve exit code
exit /b %ERRORLEVEL%
