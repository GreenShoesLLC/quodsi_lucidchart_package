# ElementProxy

An element is anything on a Lucid document that can have properties and shape data:

The document itself
- Pages
- Blocks
- Lines
- Groups

Extends
- PropertyStoreProxy

Extended by
- DocumentProxy
- ItemProxy
- PageProxy


## Constructors

_(Information about constructors isn't typically provided directly for proxy objects. You usually obtain an `ElementProxy` instance through other means.)_ You likely get an `ElementProxy` instance through methods on other objects. See the Lucidchart documentation for how to obtain a reference to an `ElementProxy`.

## Properties

_(Properties are often accessed directly, like `element.propertyName`.)_

*   _(Consult the official Lucidchart documentation for the complete and up-to-date list of properties and their types. Properties may include things like the element's ID, type, bounds, parent, or style.)_ Look for properties related to:
    *   `id`: The unique identifier of the element.
    *   `type`: The type of the element.
    *   `bounds`: The rectangular bounds of the element (position and size).
    *   `x`: The x-coordinate of the element.
    *   `y`: The y-coordinate of the element.
    *   `width`: The width of the element.
    *   `height`: The height of the element.
    *   `parent`: The parent object of the element.
    *   `style`: The style properties of the element.

## Methods

_(Methods are called like `element.methodName(arguments)`.)_

*   _(This list is illustrative. Consult the official Lucidchart documentation for the complete and up-to-date list of methods and their parameters and return types.)_ Methods you might expect to find (but check the official docs):
    *   `move(x, y)`: Moves the element to the specified coordinates.
    *   `resize(width, height)`: Resizes the element to the specified dimensions.
    *   `delete()`: Deletes the element.
    *   `getParent()`: Returns the parent object of the element.
    *   `getBounds()`: Returns the bounds of the element.
    *   `getStyle()`: Returns the style properties of the element.
    *   `setStyle(style)`: Sets the style properties of the element.
    *   _(Potentially methods for rotation, z-order manipulation, etc.)_

