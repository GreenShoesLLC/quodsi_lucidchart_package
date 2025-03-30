# Lucid Package Bundle Orchestration Script (`Build-Lucid-Bundle.ps1`)

This PowerShell script orchestrates the process of preparing environment variables and bundling the Lucidchart package. It allows for an optional, separate build of the `quodsim-react` application beforehand.

**Core Workflow:**
1.  Sets required environment variables (`REACT_APP_...`) based on the specified `TargetEnvironment`. These variables are used by the final `npx lucid-package bundle` command.
2.  **Optionally** (if the `-RunReactBuild` switch is used): Executes the separate `Build-QuodsimReact.ps1` script, passing the `TargetEnvironment`. Checks if this build was successful and aborts if not. **By default, this step is skipped.**
3.  Changes the working directory to the root of the Lucidchart package (`C:\_source\Greenshoes\quodsi_lucidchart_package`).
4.  Executes the `npx lucid-package@latest bundle` command from the package root directory. This command performs its *own* internal React build using the environment variables set in Step 1.
5.  Checks if the Lucid bundling was successful.

## Prerequisites

Before running this script, ensure the following are met:

1.  **Windows OS:** The script is designed for PowerShell on Windows.
2.  **PowerShell:** Available on the system.
3.  **Node.js & npm/npx:** Installed and configured in the system's PATH. Required for the Lucid bundling command and potentially the optional React build.
4.  **`Build-QuodsimReact.ps1` Script:** The React build script must exist at the location specified within *this* script **only if you intend to use the `-RunReactBuild` flag**. The assumed path is:
    `C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\react-deployment\Build-QuodsimReact.ps1`
    * If this path is incorrect and you use `-RunReactBuild`, you must update the `$ReactBuildScriptPath` variable inside `Build-Lucid-Bundle.ps1`.
5.  **Project Structure:** The script assumes the Lucidchart package root directory is:
    `C:\_source\Greenshoes\quodsi_lucidchart_package`
    * If this path is incorrect, you must update the `$LucidPackageDir` variable inside `Build-Lucid-Bundle.ps1`.
6.  **Source Code:** The necessary source code for both the React app and the Lucid package structure must be present at the expected locations.

## How to Run

**Working Directory:**

You have **two main options** regarding your working directory when you run this script (`Build-Lucid-Bundle.ps1`):

1.  **Navigate to the Script's Directory First:**
    * Open PowerShell.
    * Change your directory (`cd`) to where this script is saved:
        ```powershell
        cd C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\lucid-package-bundle\
        ```
    * Execute the script using the `.\` notation (which means "in the current directory"):
        ```powershell
        # Example using .\ notation after cd
        .\Build-Lucid-Bundle.ps1 -TargetEnvironment YourEnvironment [-RunReactBuild]
        ```

2.  **Run from Any Directory using the Full Path:**
    * Open PowerShell.
    * You can remain in *any* directory.
    * Execute the script by specifying its *full, absolute path* (as shown in the examples below).

**Conclusion on Working Directory:** The directory you are in when you *launch* `Build-Lucid-Bundle.ps1` only affects *how you reference the script file itself*. The script **internally manages** changing to the correct directories required for its tasks. The examples below use the full path method for clarity and easy copy-pasting.

**Execution Policy:**
As with any PowerShell script, you might need to adjust your execution policy if you encounter errors. For the current session, you can often use:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

Okay, here is the updated README.md with an expanded "Examples" section providing explicit, copy-pasteable commands for all three environments (Dev, TST, PRD), covering both default usage and usage with the -RunReactBuild flag.

Markdown

# Lucid Package Bundle Orchestration Script (`Build-Lucid-Bundle.ps1`)

This PowerShell script orchestrates the process of preparing environment variables and bundling the Lucidchart package. It allows for an optional, separate build of the `quodsim-react` application beforehand.

**Core Workflow:**
1.  Sets required environment variables (`REACT_APP_...`) based on the specified `TargetEnvironment`. These variables are used by the final `npx lucid-package bundle` command.
2.  **Optionally** (if the `-RunReactBuild` switch is used): Executes the separate `Build-QuodsimReact.ps1` script, passing the `TargetEnvironment`. Checks if this build was successful and aborts if not. **By default, this step is skipped.**
3.  Changes the working directory to the root of the Lucidchart package (`C:\_source\Greenshoes\quodsi_lucidchart_package`).
4.  Executes the `npx lucid-package@latest bundle` command from the package root directory. This command performs its *own* internal React build using the environment variables set in Step 1.
5.  Checks if the Lucid bundling was successful.

## Prerequisites

Before running this script, ensure the following are met:

1.  **Windows OS:** The script is designed for PowerShell on Windows.
2.  **PowerShell:** Available on the system.
3.  **Node.js & npm/npx:** Installed and configured in the system's PATH. Required for the Lucid bundling command and potentially the optional React build.
4.  **`Build-QuodsimReact.ps1` Script:** The React build script must exist at the location specified within *this* script **only if you intend to use the `-RunReactBuild` flag**. The assumed path is:
    `C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\react-deployment\Build-QuodsimReact.ps1`
    * If this path is incorrect and you use `-RunReactBuild`, you must update the `$ReactBuildScriptPath` variable inside `Build-Lucid-Bundle.ps1`.
5.  **Project Structure:** The script assumes the Lucidchart package root directory is:
    `C:\_source\Greenshoes\quodsi_lucidchart_package`
    * If this path is incorrect, you must update the `$LucidPackageDir` variable inside `Build-Lucid-Bundle.ps1`.
6.  **Source Code:** The necessary source code for both the React app and the Lucid package structure must be present at the expected locations.

## How to Run

**Working Directory:**

You have **two main options** regarding your working directory when you run this script (`Build-Lucid-Bundle.ps1`):

1.  **Navigate to the Script's Directory First:**
    * Open PowerShell.
    * Change your directory (`cd`) to where this script is saved:
        ```powershell
        cd C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\lucid-package-bundle\
        ```
    * Execute the script using the `.\` notation (which means "in the current directory"):
        ```powershell
        # Example using .\ notation after cd
        .\Build-Lucid-Bundle.ps1 -TargetEnvironment YourEnvironment [-RunReactBuild]
        ```

2.  **Run from Any Directory using the Full Path:**
    * Open PowerShell.
    * You can remain in *any* directory.
    * Execute the script by specifying its *full, absolute path* (as shown in the examples below).

**Conclusion on Working Directory:** The directory you are in when you *launch* `Build-Lucid-Bundle.ps1` only affects *how you reference the script file itself*. The script **internally manages** changing to the correct directories required for its tasks. The examples below use the full path method for clarity and easy copy-pasting.

**Execution Policy:**
As with any PowerShell script, you might need to adjust your execution policy if you encounter errors. For the current session, you can often use:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
Consult your organization's security guidelines before changing execution policies.

Parameters
-TargetEnvironment (Mandatory): Specifies the target environment. This determines which environment variables (REACT_APP_...) are set within this script's session. These variables are essential for the npx lucid-package bundle command's internal build. If -RunReactBuild is used, this value is also passed to that script for logging/consistency.
Valid Values: Dev, TST, PRD
-RunReactBuild (Optional Switch): If this switch is included when running the script, it will force the execution of the separate Build-QuodsimReact.ps1 script before the npx lucid-package bundle command is run.
Default Behavior: If this switch is omitted, the separate React build step is skipped.
Examples
The following examples use the full path to the script, allowing you to copy and paste them directly into your PowerShell terminal from any working directory.

## Examples

The following examples use the full path to the script, allowing you to copy and paste them directly into your PowerShell terminal from any working directory.

**Default Usage (Separate React build is SKIPPED):**

* **Development (Dev):**
    ```powershell
    C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\lucid-package-bundle\Build-Lucid-Bundle.ps1 -TargetEnvironment Dev
    ```
* **Test (TST):**
    ```powershell
    C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\lucid-package-bundle\Build-Lucid-Bundle.ps1 -TargetEnvironment TST
    ```
* **Production (PRD):**
    ```powershell
    C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\lucid-package-bundle\Build-Lucid-Bundle.ps1 -TargetEnvironment PRD
    ```

**Explicit React Build Usage (using `-RunReactBuild`):**

* **Development (Dev) with React Build:**
    ```powershell
    C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\lucid-package-bundle\Build-Lucid-Bundle.ps1 -TargetEnvironment Dev -RunReactBuild
    ```
* **Test (TST) with React Build:**
    ```powershell
    C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\lucid-package-bundle\Build-Lucid-Bundle.ps1 -TargetEnvironment TST -RunReactBuild
    ```
* **Production (PRD) with React Build:**
    ```powershell
    C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\lucid-package-bundle\Build-Lucid-Bundle.ps1 -TargetEnvironment PRD -RunReactBuild
    ```

*(**Note:** If you prefer, you can first navigate (`cd`) to the script's directory and then use `.\Build-Lucid-Bundle.ps1 ...` instead of the full path shown above.)*

Important Notes
Default Behavior Rationale: By default, the separate React build (Build-QuodsimReact.ps1) is skipped because npx lucid-package bundle performs its own internal build using the environment variables set by this script. Use -RunReactBuild only if you specifically need to run the standalone React build script beforehand (e.g., for dedicated testing, troubleshooting, or if the Lucid internal build has issues).
Hardcoded Paths: This script relies on hardcoded paths for the location of the Build-QuodsimReact.ps1 script ($ReactBuildScriptPath) and the Lucid package root directory ($LucidPackageDir). If the project structure changes, you must update these paths within the script.
Dependency: The Build-QuodsimReact.ps1 script is only required if you use the -RunReactBuild flag.
Security: The environment variables set by this script include sensitive Azure Function Keys (inherited from the original requirements). Be mindful of where this script is stored and who has access. Avoid committing keys to public source control.
Date: README updated based on information available up to March 30, 2025.