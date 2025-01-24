 















Extension packagesExtension packages can be created automatically using the lucid-package CLI tool:
Shellnpx lucid-package@latest create

Extension package structure
An extension package is structured like this:
> my-package
    > editorextensions
        └── ...
    > shapelibraries
        └── ...
    > dataconnectors
        └── ...
    └── .gitignore
    └── manifest.json

The package has two settings files:

A .gitignore file for managing version control.
A manifest file called manifest.json for specifying package configuration.

Packages also contain two folders:

An editorextensions folder which will house all the code for the package's editor extensions.
A shapelibraries folder which will house definitions for shape libraries added by the package.

Manifest File
Every extension package has one manifest file called manifest.json. The manifest file houses general settings for your extension package like its ID and version. The manifest also declares the settings for any editor extensions, shape libraries, OAuth providers, and data connectors you add to the package. An empty manifest file looks like this:
manifest.json{
  "id": "9347ghfne-932nfi92hnk-sj3i8ns-0qk34e98",
  "version": "1.0.0",
  "extensions": [],
  "shapeLibraries": [],
  "oauthProviders": [],
  "dataConnectors": []
}

A manifest file contains the following fields:

id: the globaly unique identifier for your extension package. When you create an application in the developer portal (see Bundle your package for upload) you will be given an ID to use for this value.
version: the current version of your extension package. When uploading your package to the developer portal, its package version must be higher than the most recently uploaded version. Running the bundle command will increase the version automatically.
extensions: declarations and settings for editor extensions in your package.
shapeLibraries: declaration and settings for shape libraries in your package.
oauthProviders: configurations for any OAuth providers your package will leverage.
