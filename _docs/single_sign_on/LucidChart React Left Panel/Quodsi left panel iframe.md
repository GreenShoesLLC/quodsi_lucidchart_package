Persona: Act as a UI/UX designer focused on creating clear, simple interfaces for web application extensions, especially within constrained environments like iframes.

Background & Context:

Product: Quodsi, a tool that enhances diagramming platforms like Lucidchart by adding process simulation capabilities. It heavily utilizes Microsoft Azure services.
Target Platform: Lucidchart extension, specifically the left-side action panel which is displayed within an iframe limited to 300px width.
Azure AD B2C Setup (Dev Environment):
B2C Tenant: quodsib2cdev.onmicrosoft.com (Organization Name: "Quodsi")
Frontend App Registration: Quodsi Frontend SPA (Dev) (This React app runs in the iframe).
Backend API Registration: Quodsi Backend API (Dev) (Identified by https://quodsib2cdev.onmicrosoft.com/api).
User Flows Configured:
Sign up and Sign in: B2C_1_SignUpSignIn_EmailOnly_Dev (Currently configured for Email/Password only).
Password Reset: B2C_1_PasswordReset_EmailOnly_Dev.
Profile Editing: B2C_1_ProfileEdit_Dev.
Authentication Library: The React app will use MSAL (@azure/msal-react) to interact with these User Flows.
Scenario:

A Lucidchart user has discovered Quodsi in the Lucidchart Marketplace and has "connected" it, meaning the extension is active/installed for their Lucidchart account.
The user does not yet have a dedicated Quodsi account.
The user is working within a Lucidchart document and clicks the Quodsi icon.
The Quodsi left panel UI (React app) loads within its 300px wide iframe.
Task:

Propose a simple, user-friendly UI design for this initial state of the Quodsi left panel iframe (300px wide). The primary goal is to guide the user, who does not yet have a Quodsi account, towards authenticating and getting started with Quodsi features.

Requirements:

Acknowledge Context: The UI should feel integrated, perhaps with the Quodsi logo or name.
Handle Unauthenticated State: Clearly indicate that the user needs to sign in or sign up for a Quodsi account to use the features.
Support User Flows: Provide clear calls to action (like buttons) that, when clicked, will trigger the appropriate MSAL functions to initiate the Azure AD B2C User Flows:
A primary action to Sign Up / Sign In (triggering B2C_1_SignUpSignIn_EmailOnly_Dev). This is the main flow needed for a new user.
Consider how/if to present "Forgot Password". Often, the "Forgot Password?" link is part of the Azure AD B2C hosted page itself (triggered from the sign-in screen), so the panel UI might only need the main "Sign Up / Sign In" button. However, briefly address if any UI element for this is needed before initiating the main flow.
Profile Editing (B2C_1_ProfileEdit_Dev) is only relevant after a user is logged in, so it does not need to be presented in this initial unauthenticated state.
Visual Layout: Describe the layout of elements considering the 300px width constraint (e.g., vertical stacking). Suggest specific UI components (buttons, text, logo).
Interaction: Briefly describe what happens visually when the user clicks the "Sign Up / Sign In" button (e.g., MSAL initiates redirect/popup to the Azure AD B2C hosted page).
Desired Output:

Provide a description of the proposed UI layout, components, text content, and interaction flow for this initial, unauthenticated state of the Quodsi left panel. Mockup descriptions or textual representations are acceptable.