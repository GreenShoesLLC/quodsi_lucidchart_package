 Managing text















Text can exist on both blocks and lines. Reading and writing the text content itself can be done through the textAreas property on either a LineProxy or BlockProxy. For example, the following code reads all the text off the current selection and then replaces it with Hello World:
TypeScriptimport {EditorClient, Menu, MenuType, Viewport} from 'lucid-extension-sdk';

const client = new EditorClient();
const menu = new Menu(client);
const viewport = new Viewport(client);

client.registerAction('hello', async () => {
    for(const item of viewport.getSelectedItems()) {
        for(const [key, plainText] of item.textAreas) {
            console.log('Old value: ' + plainText);
            item.textAreas.set(key, 'Hello world');
        }
    }
});

menu.addDropdownMenuItem({
    label: 'Hello World',
    action: 'hello',
});

While blocks typically have a set number of text areas on them, lines have any number of text areas, and those text areas can be freely moved around by the user. You can add new text areas, read and write their position on the line, and delete them:
TypeScriptconst first = line.addTextArea('Start Left', {location: 0, side: -1});
const second = line.addTextArea('Middle', {location: 0.5, side: 0});
const third = line.addTextArea('End Right', {location: 1, side: 1});

console.log(line.getTextAreaPosition(first));
line.setTextAreaPosition(first, {location: 0.25, side: 0});

line.deleteTextArea(third);

The location of a line text area is a number between 0 and 1, where 0 places the text at the first endpoint of the line, and 1 places the text at the second endpoint of the line.
The side of a line text area places the text on top of the line if it is 0, to the left of the line (when looking from the first toward the second endpoint) if it is -1, and to the right of the line if it is 1.
Hook Text Editing
Your extension can react to a user editing text in a number of ways:

It can prevent a user from editing a certain text area.
It can allow the user to edit a text area, but prevent their edit after the fact (knowing what they typed).
It can allow the user to edit a text area, but replace the value they typed with another.

To hook text editing, use the Viewport class's hookTextEdit method like this:
TypeScriptimport {EditorClient, Viewport} from 'lucid-extension-sdk';

const client = new EditorClient();
const viewport = new Viewport(client);

viewport.hookTextEdit(async (item, textAreaKey, text) => {
    if (item.properties.get(textAreaKey) === 'Deny') {
        return false;
    }

    if (item.properties.get(textAreaKey) === 'Numeric') {
        return (newValue) => {
            if (String(+newValue) === newValue) {
                return true;
            } else if (isNaN(+newValue)) {
                return false;
            } else {
                return String(+newValue);
            }
        };
    }

    return true;
});

This example watches text editing and does the following:

If the text the user is trying to edit currently says Deny, then text editing is prevented by returning false from the hook.
If the text the user is trying to edit currently says Numeric, then the text editing is allowed, but:

if the final value is not a number, the edit is reverted.
if the final value is not in the default number format, it will be replaced (e.g. +14.0 -> 14).



By default, the text editing hook is triggered only at the beginning of text editing. If you wish to listen to changes at a more granular level of key inputs during editing, you may use the eager option:
TypeScriptimport {EditorClient, Viewport} from 'lucid-extension-sdk';

const client = new EditorClient();
const viewport = new Viewport(client);

const eager = true;
viewport.hookTextEdit(async (item, textAreaKey, text) => {
    console.log('Listening for live update from ' + textAreaKey);
}, eager);

In this example, text editing is monitored eagerly, and a message is logged every half a second. It's important to note that you should avoid expensive operations when setting eager to true.
Both the text editing hook and the callback to be run when editing is complete can be async. However, be cautious with this as you will cause the user to wait until your Promise resolves before continuing their work.