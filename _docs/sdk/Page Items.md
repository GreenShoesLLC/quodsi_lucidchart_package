 Items

The content on a page consists of blocks, lines, and groups, which are all kinds of items.
All items (and in fact other elements such as pages or the document itself), have a set of properties that can be read and written using their .properties collection:
TypeScriptfunction dumpProperties(page:PageProxy) {
    for(const [blockId, block] of page.allBlocks) {
        console.log('Block of class ' + block.getClassName() + ' (' + blockId + '):')
        for(const [propertyName, propertyValue] of block.properties) {
            console.log(propertyName, propertyValue);
        }
    }
}

While this allows you access to all the underlying properties of an item, it is not typesafe and should only be used when more specific methods are not available. For example, a BlockProxy has methods to directly read its class name as a string, its rotation as a number, and so on.
Items may also have data fields and/or whole data records associated with them. You can read more about associating data with items here.