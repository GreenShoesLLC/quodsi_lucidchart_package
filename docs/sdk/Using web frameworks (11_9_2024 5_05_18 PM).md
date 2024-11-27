 Using web frameworks













When developing with the Extension API, you can utilize web frameworks to display content onto a panel or modal. The following sections will go over using Angular and React, but other frameworks can be used as well.
Angular
Complex custom UI built directly with HTML and Javascript can be difficult to write and maintain. There are a number of popular frameworks you can use to make UI development more scalable. Angular is one popular option. This section will walk you through building a simple Angular application that is displayed in a custom panel.
Step 1: Create the editor extension
Start by creating a new empty extension package, and adding an editor extension to that package:
Shellnpx lucid-package create ngtest
cd ngtest
npx lucid-package create-editor-extension with-cool-ui

Step 2: Create the Angular app and start the dev server on it
Now you will use the Angular CLI to create a new Angular application called rightpanel inside the with-cool-ui editor extension. Do these steps in a separate console, as you'll want to leave the ng serve process running separately from the lucid-package dev server:
Shellnpm install @angular/cli webpack-shell-plugin-next

mkdir -p public/rightpanel
cd editorextensions/with-cool-ui
npx ng new rightpanel
cd rightpanel
npx ng serve # Leave this running while developing

Step 3: Replace webpack.config.js for the editor extension
Here you will use webpack-shell-plugin-next (which was installed in Step 2) to prepare the Angular app for use in both development and release modes.
onWatchRun will run whenever you start up npx lucid-package test-editor-extension. Here, the script is reading the main HTML file from the Angular dev server (ng serve) that you started running in Step 2. It makes sure all of the URLs in that file are absolute (by prepending http://localhost:4200 to them) so that they will resolve correctly in your new panel's iframe. It then writes that resulting HTML out to a file in the public directory so you can use it in your extension code.
onBeforeNormalRun will run whenever you build your package for deployment with npx lucid-package bundle.
Here, the script runs a full ng build inside the rightpanel directory, then copies all the assets to the root level public folder you created in step 2. While you could do this same operation for onWatchRun, it is much slower than allowing ng serve to directly provide the code during development:
TypeScriptconst path = require('path');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

const angularTargets = [{name: 'rightpanel', port: 4200}];

module.exports = {
    entry: './src/extension.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /[\\\/]resources[\\\/]/,
                use: 'raw-loader',
                exclude: /\.json$/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'bin/extension.js',
        path: __dirname,
    },
    plugins: [
        new WebpackShellPluginNext({
            //When doing a watch build, run "ng serve" and update the html file to prefix http://localhost:4200/ to all the resource URLs
            onWatchRun: {
                scripts: angularTargets.map(
                    (target) =>
                        `mkdir -p ../../public/${target.name} &&` +
                        `curl http://localhost:${target.port} | ` +
                        `sed -E "s/(src|href)=\\"/\\\\1=\\"http:\\/\\/localhost:${target.port}\\//gi" > ` +
                        `../../public/${target.name}/index.html`,
                ),
                blocking: true,
            },
            //When doing a full build, run "ng build" and then copy all the assets to the root level public folder
            onBeforeNormalRun: {
                scripts: angularTargets.map(
                    (target) =>
                        `mkdir -p ../../public/${target.name} &&` +
                        `cd ${target.name} && ` +
                        // `npx ng build` usually works, but this is more reliable when used with build tools such as bazel
                            `./node_modules/.bin/ng build && ` +
                        `cp -r dist/${target.name}/* ../../../public/${target.name}`
                ),
                blocking: true,
                swallowError: false,
                safe: true,
            },
        }),
    ],
    mode: 'development',
};

Step 4: Use the Angular app in a panel
Update src/extension.ts:
TypeScriptimport {EditorClient, Panel, PanelLocation, Viewport} from 'lucid-extension-sdk';

const client = new EditorClient();

export class RightPanel extends Panel {
    private static icon = 'https://lucid.app/favicon.ico';

    constructor(client: EditorClient) {
        super(client, {
            title: 'From Angular',
            url: 'rightpanel/index.html',
            location: PanelLocation.RightDock,
            iconUrl: RightPanel.icon,
        });
    }
}

const rightPanel = new RightPanel(client);

Step 5: Run the Lucid dev server
Make sure your ng serve process is running (see Step 2) before doing this step, or your panel may not work.
Remember that running test-editor-extension will trigger the onWatchRun script that generates the correct HTML for the panel to work:
Shellnpx lucid-package test-editor-extension with-cool-ui

Step 6: Write your Angular app
With both the ng serve and lucid-package test-editor-extension dev servers running, the dev cycle for updating the Angular app is just editing its code and then reloading that iframe. For modals, that means closing and reopening the modal; for panels it means switching to the normal context panel and back. No need to reload the whole editor.
To use static assets in your Angular app, you will need to place your static assets in package root level's public folder under public/rightpanel. You can then reference those assets in your Angular app using <img src="img/example.png">.
📘Still Can't Load?If you are still unable to load static assets, make sure to remove the line <base href="/"> in your Angular App's index.html
If you want to share classes or other code from your extension to your UI, then just add the following in rightpanel/tsconfig.json:
JSON{
    // ...

    "compilerOptions": {
        // ...

        "paths": {
            "@extension/*": ["../src/*"]
        },
    }
}

Then you will be able to import, for example, from with-cool-ui/src/sharedthing.ts like this:
TypeScriptimport {SharedThing, SharedClass} from '@extension/sharedthing';

Remember, of course, that just because you're sharing code doesn't mean you're in a shared runtime. You still have to send serializable messages back and from from your UI project like this. You could easily make a simple Angular injectable that receives messages that you can use in your UI components:
TypeScriptimport {Injectable} from '@angular/core';

@Injectable()
export class DataFromExtension {
    public ids: string[] = [];

    constructor() {
        //Listen for lists of selected item IDs
        window.addEventListener('message', (event) => {
            if (event.data['ids']) {
                this.ids = event.data['ids'];
            }
        });

        //Once ready to receive those messages, ask the extension to refresh data
        parent.postMessage('refresh', '*');
    }
}

You can add something like this to your Panel class to keep your UI updated any time the current selection changes:
TypeScriptexport class RightPanel extends Panel {
    private readonly viewport = new Viewport(this.client);

    constructor(client: EditorClient) {
        //...
        this.viewport.hookSelection(() => this.sendStateToFrame());
    }

    private sendStateToFrame() {
        this.sendMessage({
            ids: this.viewport.getSelectedItems().map((i) => i.id),
        });
    }

    //When the app is loaded, it will send a message asking for an update.
    protected messageFromFrame(message: any) {
        if (message === 'refresh') {
            this.sendStateToFrame();
        }
    }
}

Step 7 (bonus): Add drag and drop functionality
You can add controls to your custom panels that allow users to drag and drop a new block from your panel onto the canvas.

Use Viewport.startDraggingNewBlock from the panel
In the RightPanel class you created above, you can start listening for messages from your Angular app.
You will be sending a few possible messages:

drag to indicate the user has started dragging out of the panel.
pointermove indicating the user is dragging the content over the canvas at a particular location.
pointerup indicating the user has dropped the content on the canvas at a particular location.
cancelDrag indicating the user is no longer dragging content from the panel.

You will also send a message from the extension to the panel's Angular app: dragDone indicating the user has successfully dropped the shape onto the canvas, or has otherwise cancelled the operation (e.g. by pressing Escape).
The code of the RightPanel looks like this:
TypeScriptexport class RightPanel extends Panel {
    // ...
    protected async messageFromFrame(message: any) {
        if (message.message == 'drag') {
            const maybeBlock = await this.viewport.startDraggingNewBlock({
                className: 'ProcessBlock',
                boundingBox: {x: 0, y: 0, w: 200, h: 200},
                properties: {'Text': 'Custom Text'},
            });
            if (maybeBlock) {
                maybeBlock.properties.set('FillColor', '#ff00ffff');
            }
            this.sendMessage('dragDone');
        } else if (message.message == 'pointermove') {
            this.viewport.dragPointerMove(message.x + this.framePosition.x, message.y + this.framePosition.y);
        } else if (message.message == 'pointerup') {
            this.viewport.dragPointerUp(message.x + this.framePosition.x, message.y + this.framePosition.y);
        } else if (message.message == 'cancelDrag') {
            this.viewport.cancelDraggingNewBlock();
        }
    }
}

You can see that startDraggingNewBlock returns a Promise that resolves to either the newly created block itself, or undefined if the operation was cancelled. You can use this to make changes to the new block (or carry out any other operation you need to perform) as soon as the block is dropped on the canvas.
Here, you are just creating a new standard block type, but this operation works just as well with custom shapes from your shape libraries, like this:
TypeScriptexport class RightPanel extends Panel {
    // ...
    private scoreBarDefinition:BlockDefinition|undefined;

    constructor(client: EditorClient) {
        // ...

        this.client.getCustomShapeDefinition('shapes', 'score-bar').then(def => {
            this.scoreBarDefinition = def;
        });
    }

    //When the app is loaded, it will send a message asking for an update.
    protected async messageFromFrame(message: any) {
        if (message.message == 'drag') {
            if (this.scoreBarDefinition) {
                const maybeBlock = await this.viewport.startDraggingNewBlock(this.scoreBarDefinition);
                if (maybeBlock) {
                    maybeBlock.properties.set('FillColor', '#ff00ffff');
                }
            }
            this.sendMessage('dragDone');
        } else if (message.message == 'pointermove') {
            this.viewport.dragPointerMove(message.x + this.framePosition.x, message.y + this.framePosition.y);
        } else if (message.message == 'pointerup') {
            this.viewport.dragPointerUp(message.x + this.framePosition.x, message.y + this.framePosition.y);
        } else if (message.message == 'cancelDrag') {
            this.viewport.cancelDraggingNewBlock();
        }
    }
}

Write the Angular component
Writing a well-behaved drag and drop source requires some care. This example has all of the following behaviors:

The element they drag should move with the mouse cursor when they start dragging.
The element they drag should disappear from the panel when they move onto the canvas.
The element they drag should move back to its original location if the user completes or cancels the drag in any way.

Here is some sample code performing all of these operations with a simple div as the dragged element:
app.component.html<div
    class="drag"
    (pointerdown)="pointerDown($event)"
>
    Drag me
</div>

app.component.lessdiv.drag {
    width: 100px;
    height: 100px;
    border: 4px solid red;
}

app.component.tsimport {Component} from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.less'],
})
export class AppComponent {
    private pointerDownEvent: PointerEvent | undefined;

    //As of the last pointer event, is the (captured) pointer outside the iframe's bounds?
    private pointerIsOut = false;

    private documentPointerUp = (e: PointerEvent) => {
        if(this.pointerIsOut) {
            //Notify the editor that it needs to simulate canvas pointer events
            parent.postMessage({message:'pointerup', x:e.pageX - window.scrollX, y:e.pageY - window.scrollY}, '*');
        }

        stopDrag();
    };

    private isInsideFrame(e: PointerEvent) {
        const x = e.pageX - window.scrollX;
        const y = e.pageY - window.scrollY;
        return x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight;
    }

    private documentPointerMove = (e: PointerEvent) => {
        const isInside = this.isInsideFrame(e);
        if(!this.pointerIsOut && !isInside) {
            this.startCanvasDrag();
        } else if(this.pointerIsOut && isInside) {
            //If the pointer has re-entered the iframe while dragging, tell the extension to
            //cancel the ongoing interaction for dragging the new block out.
            this.stopCanvasDrag();
        }
        this.pointerIsOut = !isInside;

        //While dragging the HTML element around, move it around
        //with relative positioning to keep it attached to the pointer cursor.
        const target = this.pointerDownEvent?.target;
        if (this.pointerDownEvent && target instanceof HTMLElement) {
            target.style.position = 'relative';
            target.style.top = e.pageY - this.pointerDownEvent.pageY + 'px';
            target.style.left = e.pageX - this.pointerDownEvent.pageX + 'px';
        }

        if(isInside) {
            //Defense in depth: If somehow the pointer buttons have been released and the user
            //is moving the pointer over this iframe again, cancel any ongoing drag operation.
            if (e.buttons == 0) {
                this.stopDrag();
            }
        }
        else {
            //Notify the editor that it needs to simulate canvas pointer events
            parent.postMessage({message:'pointermove', x:e.pageX - window.scrollX, y:e.pageY - window.scrollY}, '*');
        }
    };

    //If you have asked the extension to start a drag-new-block interaction, you need
    //to listen for a message indicating that interaction has completed (either
    //successfully or not) in order to reset the drag/drop state entirely.
    private windowMessage = (e) => {
        if (e.data === 'dragDone') {
            stopDrag();
        }
    };

    private startCanvasDrag() {
        parent.postMessage({message: 'drag'}, '*');
        window.addEventListener('message', this.windowMessage);
    }

    private stopCanvasDrag() {
        window.removeEventListener('message', this.windowMessage);
        parent.postMessage({message:'cancelDrag'}, '*');
    }

    //Start listening for pointer events on this iframe to implement drag & drop.
    private startDrag() {
        window.document.addEventListener('pointerup', this.documentPointerUp);
        window.document.addEventListener('pointermove', this.documentPointerMove);
    }

    //Cancel drag & drop, and reset the DOM back to how it began.
    private stopDrag() {
        const target = this.pointerDownEvent?.target;
        if (this.pointerDownEvent && target instanceof HTMLElement) {
            target.style.position = 'static';
            target.style.top = '';
            target.style.left = '';
            this.pointerDownEvent = undefined;
        }
        window.document.removeEventListener('pointerup', this.documentPointerUp);
        window.document.removeEventListener('pointermove', this.documentPointerMove);
        this.stopCanvasDrag();
    }

    public pointerDown(e: PointerEvent) {
        //Store the event that started the drag, as a coordinate anchor.
        this.pointerDownEvent = e;
        this.pointerIsOut = false;
        this.startDrag();
    }
}

React
Similarly, you can use React to make custom UIs. This section will walk you through building a simple React application that is displayed in a custom panel.
Step 1: Create the editor extension
Start by creating a new empty extension package, and adding an editor extension to that package:
Shellnpx lucid-package create reacttest
cd reacttest
npx lucid-package create-editor-extension with-cool-ui

Step 2: Create the React app and start the dev server on it
Now you will use Create React App to bootstrap a new React application called rightpanel inside the with-cool-ui editor extension. Do these steps in a separate console, as you'll want to leave the npm start process running separately from the lucid-package dev server:
Shellnpm install webpack-shell-plugin-next

mkdir -p public/rightpanel
cd editorextensions/with-cool-ui/
npx create-react-app rightpanel --template typescript
cd rightpanel
npm start # Leave this running while developing

Step 3: Replace webpack.config.js for the editor extension
Here you will use webpack-shell-plugin-next (which was installed in Step 2) to prepare the React app for use in both development and release modes.
onWatchRun will run whenever you start up npx lucid-package test-editor-extension. Here, the script is reading the main HTML file from the React dev server (npm start) that you started running in Step 2. It makes sure all of the URLs in that file are absolute (by prepending http://localhost:3000 to them) so that they will resolve correctly in your new panel's iframe. It then writes that resulting HTML out to a file in the public directory so you can use it in your extension code.
onBeforeNormalRun will run whenever you build your package for deployment with npx lucid-package bundle.
Here, the script runs a full npm run build inside the rightpanel directory, then copies all the assets to the root level public folder you created in step 2. While you could do this same operation for onWatchRun, it is much slower than allowing npm start to directly provide the code during development:
TypeScriptconst path = require('path');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

const reactTargets = [{name: 'rightpanel', port: 3000}];

module.exports = {
    entry: './src/extension.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /[\\\/]resources[\\\/]/,
                use: 'raw-loader',
                exclude: /\.json$/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'bin/extension.js',
        path: __dirname,
    },
    plugins: [
        new WebpackShellPluginNext({
            //When doing a watch build, run "npm start" and update the html file to prefix http://localhost:3000/ to all the resource URLs
            onWatchRun: {
                scripts: reactTargets.map(
                    (target) =>
                        `mkdir -p ../../public/${target.name} &&` +
                        `curl http://localhost:${target.port} | ` +
                        `sed -E "s/(src|href)=\\"/\\\\1=\\"http:\\/\\/localhost:${target.port}\/gi" > ` +
                        `../../public/${target.name}/index.html`,
                ),
                blocking: true,
            },
            // When doing a full build, run "npm run build" and then copy all the assets to the root level public folder
            onBeforeNormalRun: {
                scripts: reactTargets.map(
                    (target) =>
                        `mkdir -p ../../public/${target.name} &&` +
                        `cd ${target.name} && ` +
                        `npm run build && ` +
                        `sed -i -E "s/(src|href)=\\"\\//\\1=\\"\/gi" build/index.html &&` +
                        `cp -r build/* ../../../public/${target.name}`
                ),
                blocking: true,
            },
        }),
    ],
    mode: 'development',
};

Step 4: Use the React app in a panel
Update src/extension.ts:
TypeScriptimport {EditorClient, Panel, PanelLocation, Viewport} from 'lucid-extension-sdk';

const client = new EditorClient();

export class RightPanel extends Panel {
    private static icon = 'https://lucid.app/favicon.ico';

    constructor(client: EditorClient) {
        super(client, {
            title: 'From React',
            url: 'rightpanel/index.html',
            location: PanelLocation.RightDock,
            iconUrl: RightPanel.icon,
        });
    }
}

const rightPanel = new RightPanel(client);

Step 5: Run the Lucid dev server
Make sure your npm start process is running (see Step 2) before doing this step, or your panel may not work.
Remember that running test-editor-extension will trigger the onWatchRun script that generates the correct HTML for the panel to work:
Shellnpx lucid-package test-editor-extension with-cool-ui

Step 6: Write your React app
With both the npm start and lucid-package test-editor-extension dev servers running, the dev cycle for updating the React app is just editing its code and then reloading that iframe. For modals, that means closing and reopening the modal; for panels it means switching to the normal context panel and back. No need to reload the whole editor.
You might observe that the static assets generated by Create React App are not being loaded properly.
To fix this issue, all you need to do is to place your static assets in package root level's public folder under public/rightpanel. You can then reference those assets in your react app using <img src="img/example.png">.
📘This is not the public folder in your react app.
In order to share classes or other code between your extension and UI, you will need to install either craco or react-app-rewired. These tools allow you to override the default webpack settings used by Create React App:
Shellcd rightpanel
npm install @craco/craco

Then create a file called craco.config.js in the rightpanel directory:
TypeScriptconst path = require('path');
module.exports = {
  webpack: {
    alias: {
      '@extension': path.resolve(__dirname, '../src'),
    },
    configure: webpackConfig => {
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
      );

      webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);
      return webpackConfig;
    }
  },
};

Then create a file called tsconfig.paths.json in the same directory:
JSON{
    "compilerOptions": {
        "paths": {
            "@extension/*": ["../src/*"]
        }
    }
}

In tsconfig.json:
JSON{
    // ...

    "extends": "./tsconfig.paths.json",
}

Then you should change all react-scripts in package.json into craco:
JSON{
    // ...

    "scripts": {
        "start": "craco start",
        "build": "craco build",
        "test": "craco test",
        "eject": "craco eject"
    }
}

Then you will be able to import, for example, from with-cool-ui/src/sharedthing.ts like this:
TypeScriptimport {SharedThing, SharedClass} from '@extension/sharedthing';

Remember, of course, that just because you're sharing code doesn't mean you're in a shared runtime. You still have to send serializable messages back and from from your UI project like this. You could easily add a eventListener in the useEffect hook in your UI components:
TypeScriptimport React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [ids, setIds] = useState([]);

  const handleMessage = (event: MessageEvent<any>) => {
    if (event.data['ids']) {
      setIds(event.data['ids']);
    }
  }

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    //Once ready to receive those messages, ask the extension to refresh data
    window.parent.postMessage('refresh', '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);


  return (
    <div className="App">
      <div>selected Ids: {ids}</div>
    </div>
  );
}

export default App;

You can add something like this to your Panel class to keep your UI updated any time the current selection changes:
TypeScriptexport class RightPanel extends Panel {
    private readonly viewport = new Viewport(this.client);

    constructor(client: EditorClient) {
        //...
        this.viewport.hookSelection(() => this.sendStateToFrame());
    }

    private sendStateToFrame() {
        this.sendMessage({
            ids: this.viewport.getSelectedItems().map((i) => i.id),
        });
    }

    //When the app is loaded, it will send a message asking for an update.
    protected messageFromFrame(message: any) {
        if (message === 'refresh') {
            this.sendStateToFrame();
        }
    }
}
