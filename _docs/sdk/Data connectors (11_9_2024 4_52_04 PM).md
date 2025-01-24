 Data connectors














Data connectors can be created automatically using the npm run command which is a wrapper forcreate-data-connector command of the lucid-package CLI tool:
Shellnpm run create-data-connector my-data-connector

Data connector file structure
A data connector is structured like this:

The actions folder is where the implementation for each of your action handlers will go. These are called when your editor extension calls performDataAction.
index.tsis the entry point for your data connector. This is where you will define which actions your data connector supports.
debug-server.ts is a utility for running your data connector locally during development.
package.json and tsconfig.json define environment settings for your data connector.

Data connector manifest
To add a data connector to your extension package, you will need to declare it in your manifest.json file.
📘If you used the lucid-package CLI tool to create your data connector, your manifest.json file will be updated automatically to include the new data connector manifest.
Here is an example of what a data connector manifest entry might look like:
manifest.json{
  // ...

  "dataConnectors": [
    {
      "name": "my-data-connector",
      "oauthProviderName": "oauth",
      "callbackBaseUrl": "https://www.example.com/",
      "dataActions": {
        "Import": "import"
      }
    }
  ]
}

A data connector manifest should have the following fields:

name: The name of the data connector. This will be referenced by your editor extension code to specify which data connector you are using for a request.
oauthProviderName: The name of an OAuth provider that is defined in the extension package. When a request is made to the data connector, it will include the OAuth access token for the user who initiated the request so that your data connector can query an OAuth API on behalf of the user.
callbackBaseUrl: The base URL your data connector is hosted at.
dataActions: The data actions that your data connector supports, and the url suffix that should be added to the base url when the data action is invoked by the editor extension. In the above example, the data connector supports one action (Import), and requests will be made to https://www.example.com/import when the editor extension invokes that action.
