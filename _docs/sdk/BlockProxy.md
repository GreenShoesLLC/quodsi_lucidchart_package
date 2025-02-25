# BlockProxy
A block is a single shape on the document. A BlockProxy provides an interface to
read and write the content of an existing block, and is typically accessed through
PageProxy.blocks or another similar mechanism.

This document outlines the constructors, methods, and properties of the `BlockProxy` object in the Lucidchart SDK. **Always refer to the official Lucidchart developer documentation for the most accurate and up-to-date information.**

## Constructors

_(Information about constructors isn't typically provided directly for proxy objects. You usually obtain a `BlockProxy` instance through other means, like selecting a block in the document.)_ You likely get a `BlockProxy` instance using methods on the `Document` or other objects. See the Lucidchart documentation for how to obtain a reference to a `BlockProxy`.

## Properties

_(Properties are often accessed directly, like `block.propertyName`.)_

*   _(Consult the official Lucidchart documentation for the complete and up-to-date list of properties and their types. Properties may include things like the block's ID, type, bounds, parent, or children.)_ Look for properties related to:
    *   `id`: The unique identifier of the block.
    *   `type`: The type of the block (e.g., shape, text, line).
    *   `bounds`: The rectangular bounds of the block (position and size).
    *   `x`: The x-coordinate of the block.
    *   `y`: The y-coordinate of the block.
    *   `width`: The width of the block.
    *   `height`: The height of the block.
    *   `parent`: The parent object of the block.
    *   `children`: An array or collection of child blocks (if it's a container).
    *   `page`: The page the block is on.
    *   `rotation`: The rotation of the block.
    *   `style`: The style properties of the block.

## Methods

_(Methods are called like `block.methodName(arguments)`.)_

*   _(This list is illustrative. Consult the official Lucidchart documentation for the complete and up-to-date list of methods and their parameters and return types.)_ Methods you might expect to find (but check the official docs):
    *   `move(x, y)`: Moves the block to the specified coordinates.
    *   `resize(width, height)`: Resizes the block to the specified dimensions.
    *   `delete()`: Deletes the block.
    *   `getParent()`: Returns the parent object of the block.
    *   `getChildren()`: Returns an array or collection of child blocks.
    *   `getBounds()`: Returns the bounds of the block.
    *   `getStyle()`: Returns the style properties of the block.
    *   `setStyle(style)`: Sets the style properties of the block.
    *   `getText()`: Returns the text content of the block (if applicable).
    *   `setText(text)`: Sets the text content of the block (if applicable).
    *   `rotate(degrees)`: Rotates the block by the specified number of degrees.
    *   `toFront()`: Brings the block to the front.
    *   `toBack()`: Sends the block to the back.
    *   _(Potentially methods for adding children, removing children, changing z-order, etc.)_

**Key Reminder:** This information is based on general expectations for a drawing/diagramming API and my previous knowledge. The *definitive* source for the `BlockProxy` object's properties and methods is the official Lucidchart developer documentation. Use this Markdown as a starting point, but always verify with the official docs.