@echo off
cd C:\_source\Greenshoes\quodsi_lucidchart_package\shared
echo Running fixture generation for mixed distribution model...
call npm run test:update-single-snapshot -- model_def_mixed_distributions
echo.
echo If successful, you can now verify the fixture with:
echo npm run test:verify-single-snapshot --model=model_def_mixed_distributions
pause
