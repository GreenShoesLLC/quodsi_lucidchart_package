import {
    EditorClient, Menu, Viewport, BlockProxy, PageProxy,
    ItemProxy,
    DocumentProxy,
    MenuType
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

    if (items.length === 1) {
        // There's exactly one item
        const selectedItem = items[0];
        const objectType = selectedItem
            ? LucidChartUtils.getShapeDataAttribute(selectedItem, LucidChartUtils.OBJECT_TYPE_KEY)
            : undefined;
        let serializedData = '';
        if (selectedItem.shapeData) {
            serializedData = selectedItem.shapeData.getString(LucidChartUtils.DATA_KEY) || '';
            console.log('Extension: serializedData=', serializedData);
        }
        else {
            console.log('Extension: Element does not have shape data');
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
    else if (items.length === 0) {
        const activePage: PageProxy | undefined = viewport.getCurrentPage();
        if (activePage) {
            const selectedItem = activePage;
            const objectType = selectedItem
                ? LucidChartUtils.getShapeDataAttribute(selectedItem, LucidChartUtils.OBJECT_TYPE_KEY)
                : undefined;
            let serializedData = '';
            if (selectedItem.shapeData) {
                serializedData = selectedItem.shapeData.getString(LucidChartUtils.DATA_KEY) || '';
            }
            // Create an instance of the message
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
}
viewport.hookSelection(selectionChangedCallback);


client.registerAction("import", async () => {
    // Temporary workaround. You must call oauthXhr once before performDataAction will work
    const triggerOauth = await client.oauthXhr("lucid", {
        url: "https://api.lucid.co/folders/search",
        headers: {
            "Lucid-Api-Version": "1",
            "Content-Type": "application/json",
        },
        data: "{}",
        method: "POST",
    });
    const result = await client.performDataAction({
        dataConnectorName: "data-connector-1",
        actionName: "Import",
        actionData: { message: "ImportFolders" },
        asynchronous: true,
    });
    console.log(result);
});

menu.addMenuItem({
    label: "Import",
    action: "import",
    menuType: MenuType.Main,
});