 lucid-package CLI
















lucid-package is a command-line interface for creating and managing extension packages. The getting started section goes over the very basics of using lucid-package to create and test an extension.
To install lucid-package, just use npm install lucid-package. It is then directly executable with npx, for example npx lucid-package create.
This section describes each command available in the lucid-package CLI in detail. For a quick start using the CLI, see Getting started.
create
Shellnpx lucid-package create <name>

Use lucid-package create to create a new Lucid extension in a new directory. This command prompts user for various inputs and then creates a Lucid extension package with the inputs.
create-editor-extension
Shellnpx lucid-package create-editor-extension <name>

This command creates a new directory with the given name, with a very simple editor extension inside it. Your manifest.json file is also updated to refer to this new editor extension.
You should adjust the product and scopes in the new extensions entry in the manifest to match your needs. You should request the minimum scopes required to implement your editor extension.
create-data-connector
Shellnpx lucid-package create-data-connector <name>

This command creates a new directory with the given name in the data-connectors folder of your extension package.
The new data connector comes with some skeleton code, and your manifest.json file is also updated to refer to this new data connector.
To use your data connector you must add an OAuth provider and update the oauthProviderName of the newly created data connector declaration in your manifest.json file.
You will also need to declare which data actions your data connector will support in the dataActions field of your data connector.
Finally, you will need to set a callbackBaseUrl for your data connector. For developing locally, you can set your callbackBaseUrl to http://localhost:3001/?kind=action&name= and then run the debug server with this command:
Shellnpx nodemon debug-server.ts

create-shape-library
Shellnpx lucid-package create-shape-library <name>

This command creates a shape library in a new directory with the given name, and adds a reference to that shape library in manifest.json. You can then test your shape library using the test-shape-libraries or test-editor-extension command.
For more information, see the Shape Libraries section in the developer guide.
create-image-shape-library
Shellnpx lucid-package create-image-shape-library <name> <image-path>

This command creates a shape library from a directory of images. Every file in the target folder will become a new shape with a corresponding image. Width and height for each image will be read in automatically.
You can add the tag --aspectRatio which will lock the aspect ratio for all shapes. If you want to manually set the width and height use --width x --height y.
You can then test normally with test-shape-libraries or test-editor-extension command.
test-editor-extension
Shellnpx lucid-package test-editor-extension <name>

This starts a local HTTP server that watches the given editor extension's source code and provides a debug-compiled version of it to the Lucid product specified for that editor extension in manifest.json.
See Getting started for more information on debugging editor extensions.
This command also serves all shape libraries in your extension package as well, as often those shape libraries are needed by the editor extensions to work correctly. See test-shape-libraries for more details.
test-shape-libraries
Shellnpx lucid-package test-shape-libraries

This starts a local HTTP server that watches this extension's shape library source code and provides a debug-compiled version of it to the Lucid product specified for those shape libraries in manifest.json.
While running this command, all shape libraries in this extension are automatically activated and loaded into the shape toolbox. This is not the case when an end user installs your extension, but is provided as a convenience to make it easier and faster to test changes to shape libraries.
Changes to shape code should be reflected almost immediately, without a need to refresh the browser.
bundle
Shellnpx lucid-package bundle

The bundle command compiles the editor extensions and custom shape libraries in the current extension package and produces the final package.zip file that you upload to the Developer Portal as a version of your extension.
Multiple environments
The bundle command will default to bundling your package defined with the manifest.json. However, you can provide an environment parameter to define which manifest you would like to mixin when bundling. The values in that manifest will override values in manifest.json.
Shellnpx lucid-package bundle --env=staging

This example will mix in the values from manifest.staging.json and use that in the environment scoped package package-staging.zip.
build-editor-extension
Shellnpx lucid-package build-editor-extension <name>

After creating an editor extension as part of your extension package, build-editor-extension compiles that extension in release mode, performing type checking and producing the final bin/extension.js file that is included as part of the final bundle you upload to the developer dashboard.
This command is not necessary to use directly, as the bundle command already compiles your extensions, but may be useful as a troubleshooting tool.
update-sdk
Shellnpx lucid-package update-sdk

This command updates the npm dependency of each of your editor extensions to the latest published version of lucid-extension-sdk. You can also do this yourself by going into the directory of each editor extension and running npm install lucid-extension-sdk@latest.