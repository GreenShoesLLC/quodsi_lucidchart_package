I've been working on implementing authentication for a Quodsi extension for Lucidchart. Here's what we've accomplished so far:

Created an AuthPanel.ts file that implements a left-side panel using PanelLocation.ContentDock

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\authConfig.ts

Updated extension.ts to initialize both panels (AuthPanel and ModelPanel) with proper visibility control

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\extension.ts

Added authentication message types to MessageTypes.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\MessageTypes.ts

Created AuthPayloads.ts for typed messaging

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads\AuthPayloads.ts

Implemented basic UI for the auth panel in QuodsiApp.tsx

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\QuodsiApp.tsx

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\useAuthentication.ts


Set up MSAL authentication with Azure AD B2C
Successfully configured authConfig.ts to connect to our Azure B2C tenant
Fixed redirect URI issues and successfully authenticated a user

For our next steps, we need to:

Ensure the useAuthentication hook correctly captures user information
Update the UI to properly display authenticated state
Make the ModelPanel visible when authenticated
Implement proper token and session management
Handle potential authentication errors gracefully
Test the full authentication flow in the Lucidchart environment

Could you help me implement the remaining parts of this authentication flow?