Editor extensionsEditor extensions can be created automatically using the npm run command:
Shellnpm run create-editor-extension my-editor-extension

Editor Extension File Structure
Editor extensions are structured like this:
inline:sh> editorextensions
    > my-editor-extension
        > node_modules
            └── ...
        > resources
            └── import.html
            └── resource.d.ts
        > src
            └── extension.ts
            └── importmodal.ts
            └── interop.d.ts
        └── package-lock.json
        └── package.json
        └── tsconfig.json
        └── webpack.config.js

The resources folder contains resource files used by your editor extension.
When you generate a new editor extension with the lucid-package CLI tool, resources will contain two files:

import.html: includes a very basic import modal to get you started with an import flow.
resource.d.ts: responsible for specifying what type of content you want to include as resources.

The src houses all of the code for your extension, and starts with some skeleton files to get your extension up and running:

extension.ts: the entry point for your extension code.
importmodal.ts: example code illustrating the use of modals.
interop.d.ts: standard method definitions.

The package-lock.json, package.json, tsconfig.json, and webpack.config.js files define environment settings for your project.
Editor Extension Manifest
To add an editor extension to your extension package, you need to declare the editor extension in your manifest.json file.
📘If you used the lucid-package CLI tool to create your editor extension, your manifest.json file will be updated automatically to include the new editor extension manifest.
Here is an example of what an editor extension manifest entry might look like:
manifest.json{
  // ...

  "extensions": [
    {
      "name": "my-editor-extension",
      "title": "My Editor Extension",
      "products": ["chart", "spark"],
      "codePath": "editorextensions/my-editor-extension/bin/extension.js",
      "scopes": [
        "READ",
        "WRITE",
        "DOWNLOAD",
        "SHOW_MODAL",
        "CUSTOM_UI",
        "NETWORK"
      ]
    }
  ]
}

An editor extension manifest should have the following fields:


name: the name of the extension. This should match the name of the folder that contains the editor extension.


title: a user facing title string that is used in Lucid components like modals and dropdown menus.


products: the products that the editor extension can be used in: ["chart", "spark", "teamspaces"].


codePath: the file path to the entry point of your extension. By default, this will be set to bin/extension.js, which is created when you bundle your package.


scopes: the scopes that your editor extension has access to. These are the scopes that an editor extension can have:
ScopeDescriptionREADAllows you to read elements and data from the documentWRITEAllows you to write elements and data from the documentSHOW_MODALAllows you to show modalsCUSTOM_UIAllows you to create custom panels in the right dock in LucidchartDOWNLOADAllows you to enable downloading data as a fileNETWORKAllows you to have direct access to a simple XHR APIOAUTH_TOKENAllows you to access the user's OAuth tokenUSER_INFOAllows you to use the UserProxy to access user information (see Users)

