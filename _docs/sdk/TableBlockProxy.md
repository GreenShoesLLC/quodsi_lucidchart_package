# TableBlockProxy

A block is a single shape on the document. A BlockProxy provides an interface to
read and write the content of an existing block, and is typically accessed through
PageProxy.blocks or another similar mechanism.

## Extends
- BlockProxy

This document outlines the constructors, methods, and properties of the `TableBlockProxy` object in the Lucidchart SDK.  

## Constructors

_(Information about constructors isn't typically provided directly for proxy objects.  You usually obtain a `TableBlockProxy` instance through other means, like selecting a table in the document.)_  You likely get a `TableBlockProxy` instance using methods on the Document or other objects.  See the Lucidchart documentation for how to obtain a reference to a `TableBlockProxy`.

## Properties

_(Properties are often accessed directly, like `table.propertyName`.)_

*   _(Consult the official Lucidchart documentation for the complete and up-to-date list of properties and their types.  Properties may include things like the table's ID, name, dimensions, or parent object.)_  Look for properties related to:
    *   `id`: The unique identifier of the table.
    *   `name`: The name of the table.
    *   `width`: The width of the table.
    *   `height`: The height of the table.
    *   `parent`: The parent object of the table.
    *   `cells`: Access to the cells within the table (likely via a collection or array).
    *   `rows`: Access to the rows in the table.
    *   `columns`: Access to the columns in the table.

## Methods

_(Methods are called like `table.methodName(arguments)`.)_

*   _(This list is illustrative.  Consult the official Lucidchart documentation for the complete and up-to-date list of methods and their parameters and return types.)_  Methods you might expect to find (but check the official docs):
    *   `getRange(rowStart, colStart, rowEnd, colEnd)`: Returns a `Range` object representing the specified cells.
    *   `getCell(row, col)`: Returns a `Cell` object at the specified row and column.
    *   `getRows()`: Returns an array or collection of `Row` objects.
    *   `getColumns()`: Returns an array or collection of `Column` objects.
    *   `insertRow(index)`: Inserts a new row at the specified index.
    *   `deleteRow(index)`: Deletes the row at the specified index.
    *   `insertColumn(index)`: Inserts a new column at the specified index.
    *   `deleteColumn(index)`: Deletes the column at the specified index.
    *   `setValue(row, col, value)`: Sets the value of the cell at the specified row and column.
    *   `getValue(row, col)`: Gets the value of the cell at the specified row and column.
    *   `setStyle(row, col, style)`: Sets the style of the cell at the specified row and column.
    *   `getStyle(row, col)`: Gets the style of the cell at the specified row and column.
    *   _(Potentially methods for merging cells, splitting cells, setting table properties, etc.)_

**Key Reminder:** This information is based on general expectations for a table API and my previous knowledge.  The *definitive* source for the `TableBlockProxy` object's properties and methods is the official Lucidchart developer documentation.  Use this Markdown as a starting point, but always verify with the official docs.