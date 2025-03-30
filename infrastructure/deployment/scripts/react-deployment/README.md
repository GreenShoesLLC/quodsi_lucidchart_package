# Build Script for quodsim-react

This repository contains a PowerShell script (`Build-QuodsimReact.ps1`) designed to automate the build process for the `quodsim-react` React application on a Windows machine.

The script performs the following actions:
1.  Navigates to the specified project directory.
2.  Removes the existing `build` directory to ensure a clean build.
3.  Sets the necessary environment variables (`REACT_APP_DATA_CONNECTOR_API_URL` and `REACT_APP_AZURE_STATUS_FUNCTION_KEY`) based on the target environment specified (Dev, TST, or PRD). These variables are set *only* for the duration of the script's execution.
4.  Verifies that the environment variables have been set (outputs the URL, confirms the key is set).
5.  Executes the `npx react-scripts build` command to create the production build.
6.  Outputs status messages throughout the process.

## Prerequisites

Before running the script, ensure you have the following:

1.  **Windows Operating System:** The script is designed for PowerShell on Windows.
2.  **PowerShell:** Typically included with modern Windows versions.
3.  **Node.js and npm/npx:** Required for running React scripts. Ensure `node`, `npm`, and `npx` are accessible from your PowerShell terminal (i.e., configured in your system's PATH). You can download Node.js (which includes npm and npx) from [https://nodejs.org/](https://nodejs.org/).
4.  **Project Source Code:** The `quodsim-react` project source code must be present on your machine. The script currently assumes the project is located at:
    `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react`
    * **Note:** If your project path is different, you must update the `$ProjectDirectory` variable inside the `Build-QuodsimReact.ps1` script file.

## How to Use

1.  **Save the Script:** Ensure the `Build-QuodsimReact.ps1` file is saved to your machine.
2.  **Open PowerShell:** Launch a PowerShell terminal. You can do this by searching for "PowerShell" in the Windows Start menu.
3.  **Execution Policy (If Necessary):** PowerShell has an execution policy to prevent running untrusted scripts. If you encounter an error related to execution policy, you might need to temporarily bypass it for the current process. **Run PowerShell as Administrator** for this step if changing policies beyond the current process. For running it just once in the current session (often sufficient and safer), you can use:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
    ```
    * Consult your organization's security guidelines before changing execution policies permanently.
4.  **Navigate (Optional):** You can either navigate to the directory where you saved the script using `cd C:\path\to\script\directory` or provide the full path to the script when running it.
5.  **Run the Script:** Execute the script, providing the target environment using the `-TargetEnvironment` parameter.

## Parameters

* `TargetEnvironment` (**Mandatory**): Specifies the target environment for the build.
    * **Valid Values:** `Dev`, `TST`, `PRD`
    * This parameter determines which set of API URLs and Function Keys are used.

## Examples

* **Build for the Development environment:**
    ```powershell
    .\Build-QuodsimReact.ps1 -TargetEnvironment Dev
    ```

* **Build for the Test environment:**
    ```powershell
    .\Build-QuodsimReact.ps1 -TargetEnvironment TST
    ```

* **Build for the Production environment:**
    ```powershell
    .\Build-QuodsimReact.ps1 -TargetEnvironment PRD
    ```

* **Using Positional Parameter (Alternative):** Since `TargetEnvironment` is the first parameter, you can omit the parameter name if it's the first argument:
    ```powershell
    .\Build-QuodsimReact.ps1 Dev
    ```

## Important Notes

* **Project Path:** The script contains a hardcoded path to the project directory (`$ProjectDirectory`). If your project is located elsewhere, **you must edit the script** and update this path.
* **Environment Variables Scope:** The environment variables set by this script (`REACT_APP_DATA_CONNECTOR_API_URL`, `REACT_APP_AZURE_STATUS_FUNCTION_KEY`) are only set within the scope of the PowerShell process running the script. They will not persist after the script finishes or be available in other terminals.
* **Security:** The script embeds Azure Function Keys directly within it. Be mindful of where this script is stored and who has access to it, as these keys grant access to your Azure Functions. Avoid committing this script with keys into public source control repositories. Consider using more secure methods for key management (like Azure Key Vault or environment variables set outside the script) in a production workflow.
* **Output:** The build output will be placed in the `build` sub-directory within your project folder (e.g., `C:\_source\...\quodsim-react\build`).