I've been working on implementing authentication for a Quodsi extension for Lucidchart. Here are the key files for your review and understanding:

# Auth Related shared
Added authentication message types to MessageTypes.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\MessageTypes.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads\AppLifecyclePayloads.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads\AuthPayloads.ts
# Auth Related quodsi_editor_extension
Created an AuthPanel.ts file that implements a left-side panel using PanelLocation.ContentDock
Updated extension.ts to initialize both panels (AuthPanel and ModelPanel) with proper visibility control

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\extension.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\AuthPanel.ts

# Auto Related quodsim-react

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\QuodsiApp.tsx

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\useAuthentication.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\AuthProvider.tsx

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\auth\authConfig.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\auth


Here's what we've accomplished so far:
Within Azure Portal configured 2 App Registrations

displayName	"Quodsi Frontend SPA (Dev)"	"Quodsi Backend API (Dev)"
appID	71597220-4889-4c06-8c08-152dfae2082b	416d06b1-296b-419a-8180-4cabf8f15ecf
keyCredentials	[]	[]
passwordCredentials	[]	[]
id	187e6f86-f01b-43e7-86d1-e01409114801	73678159-5095-4c79-bdca-ab8f4e2eefee
isFallbackPublicClient	null	null
identifierUris	[]	["https://quodsidevb2c.onmicrosoft.com/api"]
isDeviceOnlyAuthSupported	null	null
groupMembershipClaims	null	null
publisherDomain	quodsidevb2c.onmicrosoft.com	quodsidevb2c.onmicrosoft.com
signInAudience	AzureADandPersonalMicrosoftAccount	AzureADandPersonalMicrosoftAccount
tags	[]	[]
tokenEncryptionKeyId	null	null
api.requestedAccessTokenVersion	2	2


in the current state, running in LucidChart, the AuthPanel icon is visible.  When clicked, it shows a Sign In button.  If the user clicks the "Sign In" button, then a new page is shown allowing the user to sign in.  If the user signs in with correct username and password, then the AuthPanel correctly shows the user as signed in, with buttons to "Edit Profile" and "Sign Out"

If the user clicks the "Edit Profile" button, they are prompted to sign in again and if successful sign in, the user can change name and Surname.

If the user clicks on the AuthPanel icon, the panel is closed and if the user clicks AuthPanel icon again, the panel incorrectly shows
"Initialize Quodsi Model".  My expectation is that it would remember the user is signed in still and AuthPanel correctly show the user as signed in, with buttons to "Edit Profile" and "Sign Out" just like when the user closed the panel originally.


Ensure the useAuthentication hook correctly captures user information
Update the UI to properly display authenticated state
Make the ModelPanel visible when authenticated
Implement proper token and session management
Handle potential authentication errors gracefully
Test the full authentication flow in the Lucidchart environment

Could you help me implement the remaining parts of this authentication flow?