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
"callbackBaseUrl": "https://dev-quodsi-func-v1.azurewebsites.net/api/dataConnector/",

        "Poll": "poll",
        "Patch": "patch",
        "HardRefresh": "hardRefresh"

https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used

# Build quodsim-react

## Set your working directory:
```
cd C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react
Remove-Item -Path ".\build" -Recurse -Force
```

## Set Environment Variables Based upon target environment
if target environment is Dev
```
$env:REACT_APP_DATA_CONNECTOR_API_URL="https://dev-quodsi-func-v1.azurewebsites.net/api/"
$env:REACT_APP_AZURE_STATUS_FUNCTION_KEY="zwH0vpBDPYko4QfIbNC9TjJRu4gZP9wbWu8CHuLFMrUkAzFuTazGeg=="
```
if target environment is TST
```
$env:REACT_APP_DATA_CONNECTOR_API_URL="https://tst-quodsi-func-v1.azurewebsites.net/api/"
$env:REACT_APP_AZURE_STATUS_FUNCTION_KEY="w1ERk9gEfFWk8745DeA1DiuUrflDv6sVPpQOpjudXcCGAzFuawHc-g=="
```
if target environment is PRD
```
$env:REACT_APP_DATA_CONNECTOR_API_URL="https://prd-quodsi-func-v1.azurewebsites.net/api/"
$env:REACT_APP_AZURE_STATUS_FUNCTION_KEY="IuYzy5x9yt6FRhQhL5U9j8bXePABxfSEbVQ0pVEPk6fuAzFuE0P6tw=="
```
Prior to doing a build, in the same terminal you will be making the build on, confirm the following:
echo $env:REACT_APP_DATA_CONNECTOR_API_URL
echo $env:REACT_APP_AZURE_STATUS_FUNCTION_KEY


npx react-scripts build

Delete files from here:

[Open public quodsim-react folder](file:///C:/_source/Greenshoes/quodsi_lucidchart_package/public/quodsim-react)

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
