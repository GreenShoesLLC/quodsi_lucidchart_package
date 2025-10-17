# EditorClient SDK Reference

This document provides a comprehensive reference for the EditorClient SDK, which enables communication and interaction with the Lucid editor from within your extensions.

## Overview

The EditorClient SDK provides a set of methods for interacting with the Lucid editor.  It allows your extensions to perform actions like creating and manipulating shapes, accessing document data, listening for editor events, and more.

## Installation

The EditorClient SDK is typically included within the Lucid extension development environment.  You do not need to install it separately.  Refer to the Lucid extension documentation for details on setting up your development environment.

## Usage

```javascript
// Get an instance of the EditorClient
const editorClient = new Lucid.EditorClient();

// Example: Get the current document
editorClient.getDocument()
.then(document => {
    console.log('Document ID:', document.id);
    //... further document interaction
  })
.catch(error => {
    console.error('Error getting document:', error);
  });

// Example: Create a shape
editorClient.createShape({
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 100
}).then(shape => {
  console.log("Shape created:", shape);
}).catch(error => {
  console.error("Error creating shape:", error);
});

// Example: Listen for document changes
editorClient.on('document:change', () => {
  console.log('Document has changed!');
});

// Example: Get the selection
editorClient.getSelection().then(selection => {
  console.log("Current selection:", selection);
}).catch(error => {
  console.error("Error getting selection:", error);
});


// Example: Make an authenticated API request (see oauthXHR section below)
editorClient.oauthXHR.get('/api/v1/me')
.then(response => {
    console.log('API Response:', response.data);
  })
.catch(error => {
    console.error('API Error:', error);
  });


API
EditorClient
constructor()
Creates a new EditorClient instance.  This is typically done automatically within the Lucid extension framework.

Document Methods
getDocument(): Returns a Promise that resolves with the current Document object.
getDocuments(): Returns a Promise that resolves with an array of the open Document objects.
createDocument(options): Creates a new document.
openDocument(documentId): Opens an existing document.
closeDocument(documentId): Closes a document.
Shape Methods
createShape(options): Creates a new shape.
getShape(shapeId): Retrieves a shape by ID.
updateShape(shapeId, properties): Updates a shape's properties.
deleteShape(shapeId): Deletes a shape.
Page Methods
getCurrentPage(): Gets the current page.
getPages(): Gets all pages in the document.
createPage(options): Creates a new page.
deletePage(pageId): Deletes a page.
Selection Methods
getSelection(): Returns a Promise that resolves with the current selection.
setSelection(shapeIds): Sets the current selection.
Event Methods
on(eventName, callback): Registers a listener for an editor event.
off(eventName, callback): Removes a listener.
Viewport Methods
getViewport(): Returns the current viewport information.
zoomToFit(): Zooms the viewport to fit the content.
Other Methods
executeAction(action): Executes a specific editor action.
getEditorType(): Returns the editor type (e.g., "document", "whiteboard").
getCapabilities(): Returns the editor's capabilities.
focus(): Gives focus to the editor.
oauthXHR Methods (See Separate Section)
get(url, [options])
post(url, data, [options])
put(url, data, [options])
delete(url, [options])
patch(url, data, [options])
request(config)
oauthXHR Methods (For Authenticated API Requests)
The editorClient.oauthXHR object provides methods for making authenticated requests to Lucid APIs. These methods handle OAuth 2.0 authentication, including token management and refresh.  They use the same method signatures and functionality as described in the separate OAuthXHRRequest SDK documentation (see that documentation for full details).  The key difference is that these methods are accessed through the editorClient instance.

JavaScript

editorClient.oauthXHR.get('/api/v1/me') // Example
.then(response => { /*... */ })
.catch(error => { /*... */ });
Error Handling
Most methods return Promises.  Use .then() for success and .catch() for errors:

JavaScript

editorClient.getDocument()
.then(document => { /*... */ })
.catch(error => {
    console.error('Error:', error);
  });
Important Considerations
This SDK is designed for use within Lucid extensions.
Refer to the Lucid extension documentation for details on the extension lifecycle and how to use this SDK within your extension.
The API and its functionality may change over time. Always refer to the latest Lucid developer documentation.
Example (Full)
JavaScript

const editorClient = new Lucid.EditorClient();

async function processDocument() {
  try {
    const document = await editorClient.getDocument();
    console.log('Document ID:', document.id);

    const shapes = await editorClient.getShapes();
    console.log('Number of shapes:', shapes.length);

    //... further document manipulation
  } catch (error) {
    console.error('Error processing document:', error);
  }
}

processDocument();