import {
    EditorClient, Menu, Viewport, BlockProxy, PageProxy,
    ItemProxy,
    DocumentProxy
} from 'lucid-extension-sdk';

import { v4 as uuidv4 } from 'uuid';

import { EditorModal } from './editor-modal';
import { RightPanel } from './right-panel';
import { ContentDockPanel } from './content-dock-panel';
import { HelloWorldModal } from './hello-world-modal';
import { LucidChartUtils } from './lucidChartUtils';
import { LucidChartMessageClass } from './LucidChartMessage';


const client = new EditorClient();
const menu = new Menu(client);
const viewport = new Viewport(client);
const document = new DocumentProxy(client);
const docId = document.id;


client.registerAction('hello', () => {
    // const pageModelId = LucidChartUtils.getOrCreatePageModelId(viewport);

    const pageModel = LucidChartUtils.getOrCreatePageModel(viewport);
    if (pageModel) {
        console.log('Page Model ID:', pageModel.id);
    } else {
        console.error('Failed to get or create page model');
    }
    const modal = new HelloWorldModal(client);
    modal.show();
});

client.registerAction('quodsimShapeSelected', () => {
    const selection = viewport.getSelectedItems();
    return (
        selection.length > 0 &&
        selection.length < 2 &&
        selection.every((item) => {

            if (item instanceof BlockProxy) {
                const q_objecttype = item.shapeData.get('q_objecttype');
                return q_objecttype !== undefined && q_objecttype !== null;
            }
            return false;
        })
    );
});

client.registerAction('showEditor', () => {

    const { firstSelectedItem, objectType } = LucidChartUtils.getFirstSelectedItemAndType(client);
    const modal = new EditorModal(client, "Properties", firstSelectedItem, objectType);
    modal.show();
});

client.registerAction('showLineEditor', async () => {
    const page = await viewport.getCurrentPage();
    if (page) {
        const line = page?.addLine({
            endpoint1: { x: 10, y: 10 },
            endpoint2: { x: 100, y: 100 },
        })
        line.addTextArea('Hello', { location: 0.5, side: 0 })
        const modal = new EditorModal(client, "Line Editor", line, "");
        modal.show();
    }

});
// client.registerAction('makeSelectionRed', () => {
//     for (const item of viewport.getSelectedItems()) {
//         item.properties.set('FillColor', '#ff0000ff');
//     }
// });
client.registerAction("twoShapeSelected", () => {
    const items = viewport.getSelectedItems();
    return items.length === 2;
});
menu.addContextMenuItem({
    label: 'Add Line',
    action: 'showLineEditor',
    visibleAction: 'twoShapeSelected',
});

menu.addContextMenuItem({
    label: 'Properties',
    action: 'showEditor',
    visibleAction: 'quodsimShapeSelected',
});

menu.addDropdownMenuItem({
    label: 'Say Hello5',
    action: 'hello',
});



const rightPanel = new RightPanel(client);
const contentDockPanel = new ContentDockPanel(client);

function selectionChangedCallback(items: ItemProxy[]) {
    //send a message from right panel to react
    //message should contain 
    if (items.length === 1) {
        // There's exactly one item
        const selectedItem = items[0];
        const objectType = selectedItem
            ? LucidChartUtils.getShapeDataAttribute(selectedItem, LucidChartUtils.OBJECT_TYPE_KEY)
            : undefined;
        let serializedData = '';
        if (selectedItem.shapeData) {
            serializedData = selectedItem.shapeData.getString(LucidChartUtils.DATA_KEY) || '';
        }

        const message = LucidChartMessageClass.createMessage(
            'lucidchartdata',
            serializedData,
            selectedItem.id,
            objectType,
            "1"
        );
        rightPanel.sendMessage(message.toObject());
    }
}
viewport.hookSelection(selectionChangedCallback);