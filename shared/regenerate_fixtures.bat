@echo off
echo Regenerating all expected JSON fixtures for serialization tests...
echo.

cd /d %~dp0
node regenerate_all_fixtures.js

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Error occurred during fixture regeneration.
  exit /b %ERRORLEVEL%
)

echo.
echo All fixtures have been regenerated successfully.
echo.
pause
