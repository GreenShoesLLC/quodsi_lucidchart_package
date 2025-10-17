 Using OAuth APIs

You may need to access OAuth-protected APIs from your editor extensions in order to communicate with other systems or sources of data. In order to do this, you need to:

Configure the OAuth provider in your manifest.json.
Upload your extension package to the Developer Portal, and enter the extension ID in your manifest.json.
Install your extension package for your own user account.
Enter your OAuth application credentials (client ID and client secret) on the Developer Portal.
Call EditorClient.oauthXhr from your editor extension.

Note that while these steps are all mandatory to using an OAuth provider in your extension package once installed, you can also use an OAuth provider in development mode only by following these steps instead:

Configure the OAuth provider in your manifest.json.
Create a file <providerName>.credentials.local in the root of your package, containing a JSON object with clientId and clientSecret keys.
Call EditorClient.oauthXhr from your editor extension.
Start the local dev server with npx lucid-package test-editor-extension <extensionName>.

Configure the OAuth provider
📘Currently, only OAuth 2.0 authorization via the authorization code grant flow or client credentials grant flow is supported.
Your package's manifest.json file can optionally include an array of oauthProviders which must contain the following:
FieldDescriptionExamplenameA short name by which to reference this OAuth providerfigmatitleThe name displayed to the user to describe this OAuth providerFigmagrantTypeA GrantType typeauthorizationCodetokenUrlThe URL for OAuth token exchangehttps://www.figma.com/api/oauth/tokenrefreshTokenUrlThe URL for refreshing an OAuth token in case the refresh url is different from the token urlhttps://www.figma.com/api/oauth/refreshauthorizationUrlThe URL for the OAuth user authorization flowhttps://www.figma.com/oauthusePkceA boolean flag for authorization code providers. Defaults to false. If true, the OAuth user authorization flow will use PKCE. Learn more here: https://oauth.net/2/pkce/falsescopesAn array of OAuth scopes to request["file_read"]domainWhitelistAn array of domains you may make requests to for this provider["https://www.figma.com", "https://api.figma.com"]clientAuthenticationA ClientAuthentication typebasichelpUrlA URL to a help article to be shown in Lucid when prompting to redirect to your OAuth flow (max length 255 characters)https://www.example.com/lucid-helpfaviconUrlA URL to a favicon to show in Lucid when prompting to redirect to your OAuth flow. Rendered at 24px by 24px. (max length 255 characters)https://www.example.com/lucid-favicon.png
Grant types
This configures the OAuth grant type for the OAuth 2.0 authorization flow.
TypeDescriptionauthorizationCodeThe Authorization Code grant type is used by confidential and public clients to exchange an authorization code for an access token. Learn moreclientCredentialsThe Client Credentials grant type is used by clients to obtain an access token outside of the context of a user. Learn more
Client authentication types
This configures how the client ID and client secret should be sent to the OAuth provider when exchanging the authorization code for an OAuth access token.
TypeDescriptionbasicSends client credentials as Basic Auth headerclientParametersSends client credentials in body
Upload your extension package
The access tokens (and refresh tokens, if available) granted to the user by the OAuth provider are not provided to your editor extension code to use directly. Instead, they are encrypted and stored on Lucid's servers according to our data retention and privacy policies.
Because of this, you must have a version of your extension package installed in order to use OAuth APIs, even in debug and development mode.
Go to the Lucid Developer Portal and create a new extension package project, if you have not already. Copy the extension package's ID into the id field in your manifest.json. This will allow your code to be recognized as being associated with that project even when run in debug mode.
Produce the package.zip for your extension with this command:
TypeScriptnpx lucid-package@latest bundle

and upload that package.zip file as a new version of your extension.
Configure Lucid's redirect url in OAuth provider
Many OAuth2 APIs require that developers specifically authorize a redirect url before it can be used with their OAuth2 client. Your Lucid extension will use the following redirect url:
inline:bashhttps://extensibility.lucid.app/packages/<packageId>/oauthProviders/<oauthProviderName>/authorized

If required by your OAuth provider, configure your client to authorize this redirect url. You will likely have to do this manually in your OAuth client settings.
Enter application credentials
On your extension package's details page on the Developer Portal, a section labeled "OAuth Providers" will appear. It will show that your credentials are missing for your new provider. Click through and enter the client ID and client secret you received from the OAuth provider when setting up your application with them.
These credentials are associated with your extension package's ID and the name you gave the OAuth provider. If you update your extension later with a new version, you do not need to re-enter these credentials.
Install your extension
Click on the version number of your extension that you just uploaded, and click the button to install the extension package for yourself. This will mark this version as installed and provide a place for OAuth tokens to be stored during your testing.
If you add more OAuth providers later, you need to make sure that you have a version of your extension package installed that includes all the providers you intend to use.
Call the API with EditorClient
In your editor extension, you can request an OAuth API call like this:
TypeScriptconst client = new EditorClient();
const result = await client.oauthXhr('sheets', {
    url: 'https://www.googleapis.com/oauth2/v1/userinfo',
    method: 'GET',
});

The first parameter to oauthXhr is the name of the OAuth provider you specified in your extension package's manifest. The second is in the same format as normal network requests through EditorClient—you can specify url, method, data, headers, and timeoutMs.
If the user has not yet received an OAuth token from that provider, they will be prompted to authorize with them, and then the requested API call will be made. If the user does not successfully authorize, then oauthXhr will behave as if it received a 401 UNAUTHORIZED response from the provider.
You can also request an OAuth API call using the asyncOAuthXhr command. The request is enqueued to eventually execute. The request may be attempted multiple times with an overall timeout of 120 seconds whereas the oauthXhr command will timeout in 10 seconds. asyncOAuthXhr takes the same parameters as oauthXhr.
Access credentials or tokens
If you need to access the client ID (from your application credentials) in your extension, you can make a request through the editor client like this:
TypeScriptconst client = new EditorClient();
const clientId = await client.getOAuthClientId('sheets');

The parameter to the getOAuthClientId method is the name of the OAuth provider you specified in your manifest file. It returns the client ID of the given provider, which is either stored in <providerName>.credentials.local or configured in the Lucid Developer Portal.
If you need access to a user's oauth token in your extension, you can make a request through the editor client like this:
TypeScriptconst client = new EditorClient();
const token = await client.getOAuthToken('sheets');

The parameter to the getOAuthToken method is the name of the OAuth provider you specified in your manifest file. It returns an OAuth token for the given provider, prompting the user to grant access if necessary.
OAuth security
When users authorize your extension to access external data on their behalf, Lucid stores access and refresh tokens for the user in our database. Tokens stored in this manner are encrypted. Account admins on enterprise accounts can configure unique encryption keys used to encrypt tokens for users on their account, learn more about Lucid Key Management Service here.