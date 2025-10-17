Blocks
Creating a block
Not all block classes have their code loaded on all documents, so before adding a block to a page, you must make sure that the block class has been loaded.
Once you have loaded the block class, you can add it to the page like this:
TypeScriptasync function createProcessBlock(page:PageProxy, x:number, y:number) {
    await client.loadBlockClasses(['ProcessBlock']);
    const block = page.addBlock({
        className:'ProcessBlock',
        boundingBox:{
            x, y, w:200, h:160
        }
    });
    block.textAreas.set('Text', 'The new shape');
}

You only need to load a block class once, so you may also structure your code this way to avoid needing to have async functions any time you create a block:
TypeScriptconst client = new EditorClient();

function createProcessBlock(page:PageProxy, x:number, y:number) {
    const block = page.addBlock({
        className:'ProcessBlock',
        boundingBox:{
            x, y, w:200, h:160
        }
    });
    block.textAreas.set('Text', 'The new shape');
}

async function init() {
    await client.loadBlockClasses(['ProcessBlock']);

    const menu = new Menu(client);
    menu.addDropdownMenuItem({...});
}

init();

By avoiding adding any UI (like menu items, custom panels, etc.) until your needed block classes are loaded, you can then operate synchronously in the rest of your code.
Class specific functionality
While all properties of all blocks are available through .properties, many kinds of blocks have properties specific to them that may not be obvious how to use.
When you get a BlockProxy class instance representing one block, it may actually be a subclass of BlockProxy depending on its class name. Below are two examples of specific blocks types:
ERD block
ERD blocks are returned as a ERDBlockProxy which has specific methods to read the fields specified on the ERD shape:
TypeScriptfunction dumpERD(page: PageProxy) {
    for (const [blockId, block] of page.allBlocks) {
        if (block instanceof ERDBlockProxy) {
            console.log('ERD block: ' + block.getName());
            for(const field of block.getFields()) {
                console.log('Field: ' + field.getName() + ': ' + field.getType());
            }
        }
    }
}

Generic Lucid cards
Lucid cards blocks are returned as a CardBlockProxy which has specific methods to read the fields specified on the Lucid card shape:


async function createGenericLucidCardBlock(page: PageProxy, title: string, description: string) {
    await client.loadBlockClasses(['LucidCardBlock']);
    const block = page.addBlock({
        className:'LucidCardBlock',
        boundingBox:{
            x, y, w:200, h:160
        }
    });

    if (block instanceof CardBlockProxy) {
        block.setTitle(title);
        block.setDescription(description);
    }
}

Identifying custom shapes
If you use custom shapes from a shape library in your extension, those blocks will be instances of CustomBlockProxy. This class allows you to easily check if you’re working with one of your custom shapes:
TypeScriptfunction findInstancesOfMyShape(page: PageProxy) {
    for (const [blockId, block] of page.allBlocks) {
        if (block instanceof CustomBlockProxy) {
            if (block.isFromStencil('my-library', 'my-shape')) {
                console.log('Found custom shape "my-shape": ' + block.id);
            }
        }
    }
}

You can also extend CustomBlockProxy with a class that provides behavior specific to individual custom shapes.
For example, if you create a custom shape that has a user-editable text area named TextContent, you could write the following class:
TypeScriptexport class MyCustomBlock extends CustomBlockProxy {
    public static library = 'my-shape-library';
    public static shape = 'my-custom-shape';

    public getTextContent() {
        const taName = this.getStencilTextAreaName('TextContent');
        if (!taName) {
            return '';
        }
        return this.textAreas.get(taName);
    }

    public setTextContent(text: string) {
        const taName = this.getStencilTextAreaName('TextContent');
        if (!taName) {
            return '';
        }
        return this.textAreas.set(taName, text);
    }
}

CustomBlockProxy.registerCustomBlockClass(MyCustomBlock);

When you call CustomBlockProxy.registerCustomBlockClass, it makes it so that your custom class is used for any block created from the shape you specified in library and shape. So you can write code like this:
TypeScriptconst client = new EditorClient();
const document = new DocumentProxy(client);

client.registerAction('log-custom-text-content', () => {
    for(const [pageId, page] of document.pages) {
        for(const [blockId, block] of page.blocks) {
            if(block instanceof MyCustomBlock) {
                console.log(block.getTextContent());
            }
        }
    }
});

You can also create custom blocks directly from your extension code. To do this, use the getCustomShapeDefinition method on the EditorClient class and provide the library name and shape name:
TypeScriptasync function createCustomBlock(page: PageProxy, libraryName: string, shapeName: string) {
    const customBlockDef = await client.getCustomShapeDefinition(libraryName, shapeName);

    if (!customBlockDef) {
        return;
    }

    const customBlock = page.addBlock(customBlockDef);
    customBlock.textAreas.set('Text', 'My Custom Shape');
}

📘The library name and shape name refer to the names of their respective folder and file, not the names listed in the library.manifest file.
Text on blocks
Many classes of blocks have one or more text areas. These text areas can be enumerated, read, and written using textAreas. The text is provided as plain text in this object:
TypeScriptfunction changeText(page: PageProxy) {
    for (const [blockId, block] of page.allBlocks) {
        for (const [textAreaKey, plainText] of block.textAreas) {
            block.textAreas.set(textAreaKey, plainText + ' (changed)');
        }
    }
}

You can read or write text styles on text areas using textStyles. The entries have the same keys as textAreas. When you read a text area's style, an object will be returned that describes styles that are common across the entire text area. For example, if a single word is bolded, you will not get [TextMarkupNames.Bold]: true in the result. If there are conflicting styles like that, the default style value will be returned (in the case of Bold, you will get false).
Changing text styles is asynchronous and must be awaited to be sure it is complete. This is because changing the font (using TextMarkupNames.Family, TextMarkupNames.Bold, or TextMarkupNames.Italic) may require a network request to find the appropriate font:
TypeScriptimport {TextMarkupNames, EditorClient, Menu, MenuType, Viewport} from 'lucid-extension-sdk';

const client = new EditorClient();
const menu = new Menu(client);
const viewport = new Viewport(client);

client.registerAction('toggle-bold', async () => {
    for (const item of viewport.getSelectedItems()) {
        for (const ta of item.textAreas.keys()) {
            const oldStyle = item.textStyles.get(ta);
            await item.textStyles.set(ta, {
                [TextMarkupNames.Bold]: !oldStyle[TextMarkupNames.Bold],
            });
        }
    }
});

menu.addDropdownMenuItem({
    label: 'Toggle bold',
    action: 'toggle-bold',
});

Positioning
Blocks (and other items) have a bounding box you can read with .getBoundingBox(). For blocks, this bounding box is the unrotated bounding box of the shape—that is, the bounding box it would occupy if its rotation were set to 0.
Moving or resizing a block is often subject to constraints. For example, some blocks have a minimum width or height, or do not allow resizing on one axis. Other blocks have side effects when moved, such as moving the other items along with a magnetized container.
For this reason, you cannot directly set the BoundingBox property on a block. Instead, you must use the offset method or one of the utility methods that calls it, such as setBoundingBox or setLocation.
To properly position a block, it may be necessary to determine the user's focus on the board. To achieve this, you can utilize viewport.getVisibleRect() to obtain the current viewport's location, and then create the block relative to the user's current viewing position:
TypeScriptfunction createProcessBlock(page:PageProxy, viewport:Viewport, dx:number, dy:number) {
    const {x, y} = viewport.getVisibleRect();
    const block = page.addBlock({
        className:'ProcessBlock',
        boundingBox:{
            x + dx, y + dy, w:200, h:160
        }
    });
    block.textAreas.set('Text', 'The new shape');
}
