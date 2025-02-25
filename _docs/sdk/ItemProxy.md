# ItemProxy
A block, line, or group on a page of the current document.

This document outlines the constructors, methods, and properties of the `ItemProxy` object in the Lucidchart SDK. 

## Constructors

_(Information about constructors isn't typically provided directly for proxy objects. You usually obtain an `ItemProxy` instance through other means, like selecting an item in the document.)_ You likely get an `ItemProxy` instance through methods on other objects (e.g., `PageProxy`, `DocumentProxy`). See the Lucidchart documentation for how to obtain a reference to an `ItemProxy`.

## Properties

_(Properties are often accessed directly, like `item.propertyName`.)_

*   _(Consult the official Lucidchart documentation for the complete and up-to-date list of properties and their types. Properties may include things like the item's ID, type, bounds, parent, or page.)_ Look for properties related to:
    *   `id`: The unique identifier of the item.
    *   `type`: The type of the item (e.g., shape, text, line, table).  This will likely correspond to a more specific proxy type (e.g., `BlockProxy`, `TableBlockProxy`, `LineProxy`).
    *   `bounds`: The rectangular bounds of the item (position and size).
    *   `x`: The x-coordinate of the item.
    *   `y`: The y-coordinate of the item.
    *   `width`: The width of the item.
    *   `height`: The height of the item.
    *   `page`: The `PageProxy` object representing the page the item is on.
    *   `parent`: The parent object of the item (if it has one).

## Methods

_(Methods are called like `item.methodName(arguments)`.)_

*   _(This list is illustrative. Consult the official Lucidchart documentation for the complete and up-to-date list of methods and their parameters and return types.)_ Methods you might expect to find (but check the official docs):
    *   `move(x, y)`: Moves the item to the specified coordinates.
    *   `resize(width, height)`: Resizes the item to the specified dimensions.
    *   `delete()`: Deletes the item.
    *   `getPage()`: Returns the `PageProxy` object the item is on.
    *   `getBounds()`: Returns the bounds of the item.
    *   `toFront()`: Brings the item to the front.
    *   `toBack()`: Sends the item to the back.
    *   _(Potentially methods for rotation, style manipulation, etc.)_  Since `ItemProxy` is a more general type, more specialized methods would likely be on the more specific proxy types (like `BlockProxy` or `TableBlockProxy`).
