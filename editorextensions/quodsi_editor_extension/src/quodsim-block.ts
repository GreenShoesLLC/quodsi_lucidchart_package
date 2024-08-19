import { CustomBlockProxy, EditorClient, PageProxy } from "lucid-extension-sdk";
//The library name and shape name refer to the names of their respective folder and file, not the names listed in the library.manifest file.
export class QuodsimBlock extends CustomBlockProxy {
    public static library = 'quodsi_shape_library';
    public static shape = 'activity';

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
//The library name and shape name refer to the names of their respective folder and file, not the names listed in the library.manifest file.
CustomBlockProxy.registerCustomBlockClass(QuodsimBlock);

async function createCustomBlock(client: EditorClient, page: PageProxy, libraryName: string, shapeName: string) {
    const customBlockDef = await client.getCustomShapeDefinition(libraryName, shapeName);

    if (!customBlockDef) {
        return;
    }

    const customBlock = page.addBlock(customBlockDef);
    customBlock.textAreas.set('Text', 'My Custom Shape');
}