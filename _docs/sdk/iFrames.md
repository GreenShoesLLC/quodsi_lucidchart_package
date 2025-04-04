iFrames

The Extension API allows you to display custom UI in a sandboxed iframe. The UI displayed in these iframes can communicate with your extension code via asynchronous message passing. You can define custom UI by extending the Modal or Panel class.
Modal Example
To display a simple modal, extend the Modal class, passing configuration to the super constructor:
TypeScriptimport {EditorClient, Menu, MenuType, Modal} from 'lucid-extension-sdk';

class HelloWorldModal extends Modal {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Hello world',
            width: 400,
            height: 300,
            content: 'Hello from a modal',
        });
    }
}

const client = new EditorClient();
const menu = new Menu(client);

client.registerAction('hello', () => {
    const modal = new HelloWorldModal(client);
    modal.show();
});

menu.addDropdownMenuItem({
    label: 'Say Hello',
    action: 'hello',
});

Panel Example
To add a simple panel to the right dock, extend the Panel class, passing configuration to the super constructor. Note that in this case, the HelloWorldPanel is constructed during the initial execution of the extension code, since it will live for the duration of the editor session, unlike the HelloWorldModal above that is used and then discarded when it is closed.
The iconUrl specified here can be any image, but it will be displayed as 24x24 CSS pixels. Consider using a base64-encoded image URL for this icon to avoid any image loading delay:
TypeScriptimport {EditorClient, Panel, PanelLocation} from 'lucid-extension-sdk';

class HelloWorldPanel extends Panel {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Hello world',
            iconUrl: 'https://cdn-cashy-static-assets.lucidchart.com/marketing/images/LucidSoftwareFavicon.png',
            location: PanelLocation.RightDock,
            url: 'hello.html',
        });
    }
}

const client = new EditorClient();
const panel = new HelloWorldPanel(client);


Persistent panels
Lucid may destroy the panel iframe and recreate it when needed for optimal application performance. Therefore, if you are developing an extension such as a video conference tool where your code needs to run continuously in the background, you can prevent this behavior by using the persist: true option in conjunction with location: PanelLocation.RightDock:
TypeScriptclass PersistentPanel extends Panel {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Hello world',
            content: 'Hello from a panel',
            iconUrl: 'https://cdn-cashy-static-assets.lucidchart.com/marketing/images/LucidSoftwareFavicon.png',
            location: PanelLocation.RightDock,
            persist: true,
        });
    }
}

Specifying content
Besides just specifying the content string, the best way to package HTML content into your extension is by providing a url string in either a Modal or Panel constructor.
If you don't already have a folder named public at the root of your extension package, you'll need to create one:
inline:bash> my-package
    > editorextensions
        └── ...
    > shapelibraries
        └── ...
    > dataconnectors
        └── ...
    > public
        └── img
            └── ...
        └── index.html
    └── .gitignore
    └── manifest.json

This allows you to reference the HTML file relative to the public directory:
TypeScriptimport {EditorClient, Modal} from 'lucid-extension-sdk';

export class ImportModal extends Modal {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Import a thing',
            width: 600,
            height: 400,
            url: 'index.html',
        });
    }
}

To access static resources in the public/img folder, you can use relative URLs in your HTML such as <img src="img/example.png">.
The iframe is sandboxed, but allows the following:

allow-scripts
allow-same-origin

This means your content may include scripts, external images, and so forth. Each extension is loaded on a unique
origin, so the allow-same-origin permission means you get access to browser APIs like localStorage and
IndexedDB.
External content
Although you can, you do not need to bundle the entire UI application into the content of a Modal or Panel.
Your HTML content can refer to JavaScript and CSS resources that you host elsewhere. These resources can also be derived from a framework, such as Angular or React.
If you wish to serve the entire iframe from an external URL, you just need to pass in the external URL as url in the Modal or Panel constructor:
TypeScriptexport class ContentFromElsewhereModal extends Modal {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Loading up something else',
            width: 600,
            height: 400,
            url: 'https://www.example.com',
        });
    }
}

Communicating with iframes
You can communicate with your iframe via message passing. To send a message to your iframe code, call sendMessage on your Modal or Panel subclass. You can pass any JSON-serializable value, and that value will be sent to your iframe with Window.postMessage. You can listen for these messages using the normal browser API, with your message being stored in the event object's .data:
TypeScriptwindow.addEventListener('message', (e) => {
    console.log(e.data);
});


To send a message from your iframe code to your Modal or Panel, call parent.postMessage like this:
TypeScriptparent.postMessage({
    a: 'hello',
    b: 'world',
    title: 'My Page'
}, '*');

📘The previous examples use generic javascript. If you decide to use a framework (Angular, React, etc.) for your content, how you pass or listen to messages might differ. Regardless, the code written in your Modal or Panel subclass does not need to change.
Any message you pass into parent.postMessage will be received in your Modal's or Panel's implementation of messageFromFrame. From here, you can call any method in the extension-sdk or from your own code. For example, the following code has the message logged to the console, sets the page title, and then closes the modal or panel:
TypeScriptprotected messageFromFrame(message: JsonSerializable): void {
    console.log(message['a']);
    console.log(message['b']);
    this.page.setTitle(message['title'])
    this.hide();
}

Lucid styles
You can utilize similar styles of elements that appear in Lucid products in your custom UI by linking the stylesheet at https://lucid.app/public-styles.css, which provides the most up to date styles.
Currently you can style buttons and text fields with Lucid's style patterns:
HTML<html>
    <head>
        <link type="text/css" rel="stylesheet" href="https://lucid.app/public-styles.css">
    </head>
    <body>
        <button class="lucid-styling primary">primary</button>
        <button class="lucid-styling secondary">secondary</button>
        <button class="lucid-styling tertiary">tertiary</button>
        <input
            type="text"
            class="lucid-styling"
        >
    </body>
</html>
