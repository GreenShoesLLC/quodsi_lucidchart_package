 
















OAuth 2.0 client creationIn order to use any of the Lucid REST APIs, an app must have permission from the user to access their data. This permission can be granted with an OAuth 2.0 access token. Lucid allows developers to create an OAuth 2.0 client attached to their app for this purpose. This guide focuses on creating a new app in the developer portal along with its OAuth 2.0 client.
🚧App DevelopersLucid’s REST API supports only the OAuth 2.0 Authorization Code Flow.
You should generate an OAuth 2.0 client ID and secret when building your app.
Do not ask your users to create their own client ID and secret to use your app. This is not a supported flow and can lead to frustrating authorization errors for your users. If your app is compromised, Lucid will be unable to disable or secure the affected app.Publishing is the recommended and easiest way to distribute your app to users.
Goal
You’ll learn how to create an OAuth 2.0 client through the developer portal.
This will include:

Creating a new application
Creating an OAuth 2.0 Client

Prerequisites

A licensed Lucid account
Access to developer tools

Glossary
TermDefinitionOAuth 2.0OAuth 2.0 is an industry-standard authorization framework that enables third-party applications to access a user's protected resources on a server without exposing their credentials. It allows users to grant limited access to their data while maintaining control over their sensitive information.Client IDA client ID is a unique identifier assigned to a client application by the authorization server. It is used to authenticate and authorize the client application when making requests to the server, helping establish the client's identity and permissions.Client SecretA client secret is a confidential and securely stored string or passphrase that is assigned to a client application by the authorization server. It serves as a form of authentication for the client application when interacting with the server. The client secret is used to verify the identity of the client application and protect against unauthorized access.Redirect URIThe redirect URI in OAuth 2.0 is a specific endpoint or URL that the authorization server uses to redirect the user's browser back to the client application after authentication and authorization. It serves as a callback mechanism to deliver the authorization code or access token to the client application. The redirect URI helps complete the OAuth 2.0 flow and allows the client application to obtain the necessary authorization credentials.PostmanPostman is a popular API development and testing tool that allows developers to easily send HTTP requests, observe responses, and analyze API behavior.
Step by Step Walkthrough
Step 1: Create a new application on the developer portal

Navigate to the developer portal.
Click the “Create Application” button.



Input a name for your application.

Note that this name can be changed in the app settings page later if necessary.




Step 2: Create an OAuth 2.0 client

Click on the newly created app to access its settings.
Navigate to the “OAuth 2.0” tab.
Input a name for your OAuth 2.0 client.

Note that this name will be publicly visible when users grant access to your application, and it cannot be changed.




Step 3: Note the client ID and client secret

The client ID and client secret will be used to authenticate your application when users grant access to your application.
If the client secret ever becomes compromised and needs to be reset, click the “Reset Client Secret” button on this page.

Note that once the client secret is reset, it cannot be undone. Your app will immediately lose access to Lucid until the client secret is updated in your app as well.




Step 4: Register a Redirect URI

Click the “Add Redirect URI” button on the OAuth 2.0 settings page.
Input the URL that you want to redirect users back to once they have granted permissions to your app.

This should be a URL that the app controls. Lucid will append the authorization code to the URL in the code query parameter.
If using an API tool like Postman, you can use the Test Redirect URI to retrieve the code manually while developing your integration.
For more more information, reference the glossary.




Limitations
When accessing Lucid APIs using OAuth 2.0, the following limitations apply:

If the app is not published, only specified app collaborators can use the app with your client ID and secret. If you would like to develop an app that all Lucid users can use, refer to this publishing documentation.
Authorization must happen in the browser, because a user must give consent for the client to access their information. For this reason, the authorization request cannot be made from most http clients.
