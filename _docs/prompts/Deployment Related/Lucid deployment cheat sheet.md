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

"callbackBaseUrl": "http://dev-quodsi-lucid-function-app.azurewebsites.net/api/dataConnector/",


# Build quodsim-react

cd editorextensions\quodsi_editor_extension\quodsim-react
Remove-Item -Path ".\build" -Recurse -Force
npx react-scripts build # Rebuild

# Deployment steps
cd editorextensions\quodsi_editor_extension\quodsim-react
Npx react-scripts build

copy "build" folder contents into public/quodsim-react/static

replace index.html with the "pub" version.

cd C:\_source\Greenshoes\quodsi_lucidchart_package\
npx lucid-package@latest bundle
