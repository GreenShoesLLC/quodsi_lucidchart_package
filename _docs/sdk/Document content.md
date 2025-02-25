Document content
When a user opens a Lucid product, the content they are viewing is a document. The document contains all of the information about what is displayed, as well as any data that may be used in that content. Each document consists of pages, which organize items together. A page is responsible for creating items and keeping track of all created items. Items are the blocks, lines, and groups that make up a diagram. Each item has various properties that define how it looks and how it displays information. Groups are multiple blocks and/or lines that are treated like a single item.
The extension SDK provides a mechanism for reading and writing the content of the current document through a series of proxy classes. You can read and write to a DocumentProxy's properties to save and load data onto the document for use between sessions:
extensions.tsimport {DocumentProxy, EditorClient, Menu, MenuType} from 'lucid-extension-sdk';

const client = new EditorClient();
const menu = new Menu(client);
const document = new DocumentProxy(client);

const key = 'myKey'

console.log('Loaded random number:', document.properties.get(key))

client.registerAction('generate-number', () => {
    const f = Math.random() * 100
    console.log('New random number: '+f)
    document.properties.set(key, f)
});

menu.addDropdownMenuItem({
    label: 'Generate random number',
    action: 'generate-number',
});
