 Shape libraries















This section has information on how to add a shape library to your application. You can learn more about how to design custom shapes to go in your library here.
Shape libraries can be created automatically using the npm run command:
Shellnpx run create-shape-library my-shape-library

Shape library structure
Shape libraries are structured like this:
inline:sh> shapelibraries
    > my-shape-library
        > images
            └── ...
        > shapes
            └── ...
        └── library.manifest


The images folder is where you will add images that will be used by shapes in the library.
The shapes folder contains all the .shape files for your shape library. You can learn more about .shape files here.
The library.manifest file declares all of your shapes, as well as some defaults for each shape like its height and width. You can learn more about shape library manifests here.

Shape library manifest
To add a shape library to your extension package, you will need to declare it in your manifest.json file.
📘If you used the lucid-package CLI tool to create your shape library, your manifest.json file will be updated automatically to include the new shape library manifest.
Here is an example of what a shape library manifest entry might look like:
JSON{
    // ...

    "shapeLibraries": [
        {
            "name": "my-shape-library",
            "product": "chart",
            "lcszPath": "shapelibraries/my-shape-library.lcsz"
        }
    ]
}

A shape library manifest should have the following fields:

name: The name of the shape library. This should match the name of the folder that contains the shape library.
product: Which product this shape library is for. Currently, only Lucidchart ("product": "chart") is supported.
lcszPath: The file path to the entry point of your shape library. By default, this will be shapelibraries/<name>.lcsz. This file is created when you bundle your package.
