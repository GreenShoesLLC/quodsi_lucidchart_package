@echo off
REM This is a convenience wrapper for the deployment script
REM Usage: deploy-function.bat [environment]
REM   environment: dev (default), tst, prd

set ENV=%1

REM Call the actual deployment script
call "%~dp0infrastructure\deployment\scripts\function-deployment\deploy-function.bat" %ENV%

REM Preserve exit code
exit /b %ERRORLEVEL%
