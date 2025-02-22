# Build quodsi_editor_extension zip

npx lucid-package@latest bundle

# Run quodsi_editor_extension

npx lucid-package@latest test-editor-extension quodsi_editor_extension

# Run quodsim-react

cd editorextensions\quodsi_editor_extension\quodsim-react
Npx react-scripts start

# Run quodsi_data_connector

cd dataconnectors\quodsi_data_connector
npm run start

# Build Shared Project

npm install
npm run build -w @quodsi/shared

# Manifest Local

"callbackBaseUrl": "http://localhost:7071/api/dataConnector/",

# Manfiest Dev

"callbackBaseUrl": "https://dev-quodsi-func-lucid-v1.azurewebsites.net/api/dataConnector/",

# Build quodsim-react

Prior building the react app, please do the following:

https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used

Prior to doing a build, in the same terminal you will be making the build on, confirm the following:
echo $env:REACT_APP_DATA_CONNECTOR_API_URL
echo $env:REACT_APP_AZURE_STATUS_FUNCTION_KEY

cd C:\_source\Greenshoes\quodsi*lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react
Remove-Item -Path ".\build" -Recurse -Force
$env:REACT_APP_DATA_CONNECTOR_API_URL="https://dev-quodsi-func-lucid-v1.azurewebsites.net/api/"
$env:REACT_APP_AZURE_STATUS_FUNCTION_KEY="6nP0L69_cfGT8*-548e68CYUOiQtgX_11GjqpGwx85BoAzFuMW7w2A=="
npx react-scripts build

Delete files from here:

C:\_source\Greenshoes\quodsi_lucidchart_package\public\quodsim-react

Copy files from here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\build
to:
C:\_source\Greenshoes\quodsi_lucidchart_package\public\quodsim-react

cd C:\_source\Greenshoes\quodsi_lucidchart_package\
npx lucid-package@latest bundle

Go to Developer Portal and private publish new version and install on your account.

Load up a LucidChart document and get the path from index.html

Copy this section from the route to index.html

/extensibility/frames/b1fc112b-8a7a-439e-8b64-634e4886a84e/quodsim-react

paste that onto all links in index.html located here:

C:\_source\Greenshoes\quodsi_lucidchart_package\public\quodsim-react\index.html

cd C:\_source\Greenshoes\quodsi_lucidchart_package\
npx lucid-package@latest bundle

Private Publish again.

Add that path to Function App's API/Cors origin list

# Deployment steps

copy "build" folder contents into public/quodsim-react/static

replace index.html with the "pub" version.

cd C:\_source\Greenshoes\quodsi_lucidchart_package\
npx lucid-package@latest bundle
