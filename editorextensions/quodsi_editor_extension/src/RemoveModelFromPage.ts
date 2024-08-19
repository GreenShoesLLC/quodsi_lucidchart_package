import { PageProxy, BlockProxy, LineProxy } from 'lucid-extension-sdk';
import { QuodsiShapeData } from './QuodsiShapeData';

export class RemoveModelFromPage {
    constructor(private page: PageProxy) { }

    public removeModel(): void {
        // Delete the object type and data from the page itself
        const pageShapeDataHandler = new QuodsiShapeData(this.page);
        if (pageShapeDataHandler.deleteObjectTypeAndData()) {
            console.log('Deleted q_objecttype and q_data from the page');
        }

        // Iterate over all blocks and lines on the page and delete object type and data where needed
        for (const block of this.page.allBlocks.values()) {
            const blockShapeDataHandler = new QuodsiShapeData(block);
            if (blockShapeDataHandler.deleteObjectTypeAndData()) {
                console.log(`Deleted q_objecttype and q_data from Block ID: ${block.id}`);
            }
        }

        for (const line of this.page.allLines.values()) {
            const lineShapeDataHandler = new QuodsiShapeData(line);
            if (lineShapeDataHandler.deleteObjectTypeAndData()) {
                console.log(`Deleted q_objecttype and q_data from Line ID: ${line.id}`);
            }
        }
    }
}
