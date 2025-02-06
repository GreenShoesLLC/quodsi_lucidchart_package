
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

