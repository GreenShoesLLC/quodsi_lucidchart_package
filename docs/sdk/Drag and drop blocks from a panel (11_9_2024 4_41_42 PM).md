 Drag and drop blocks from a panel











A common use case for interacting with iframes is dragging and dropping blocks. The following section will go over a very basic implementation using generic javascript and a Panel subclass. Again, if you are working with a framework, this implementation might look different for you. See our Angular walkthrough for another example.

Panel subclass
In order to achieve the above implementation, you will have to send a few possible messages from your iframe to your Panel:

drag to indicate the user has started dragging out of the panel.
pointermove indicating the user is dragging the content over the canvas at a particular location.
pointerup indicating the user has dropped the content on the canvas at a particular location.
cancelDrag indicating the user is no longer dragging content from the panel.

You will also send a message from the Panel to the iframe: dragDone, indicating the user has successfully dropped the shape onto the canvas, or has otherwise canceled the operation.
The code of the Panel subclass looks like this:
TypeScript// .....

class MyPanel extends Panel {
    private readonly viewport: Viewport;

    constructor(client: EditorClient, viewport: Viewport) {
        super(client, {
            title: 'Hello world',
            iconUrl: 'https://cdn-cashy-static-assets.lucidchart.com/marketing/images/LucidSoftwareFavicon.png',
            location: PanelLocation.RightDock,
            url: 'panel.html',
        });

        this.viewport = viewport
    }

    protected async messageFromFrame(message: any) {
        if (message.message == 'drag') {
            const maybeBlock = await this.viewport.startDraggingNewBlock({
                className: 'ProcessBlock',
                boundingBox: {x: 0, y: 0, w: 200, h: 200},
                properties: {'Text': 'Red Square', 'FillColor': '#ff0000'},
            });
            if (maybeBlock) {
                maybeBlock.properties.set('Text', 'I have been placed!');
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

const panel = new MyPanel(client, viewport);

You can see that startDraggingNewBlock returns a Promise that resolves to either the newly created block itself, or undefined if the operation was canceled. You can use this to make changes to the new block (or carry out any other operation you need to perform) as soon as the block is dropped on the canvas.
📘We also provide the method startDraggingNewImage that acts as a wrapper around startDraggingNewBlock to streamline dragging images.See the images section for more details.
The above example creates a standard process block, but this operation works just as well with custom shapes from your shape libraries:
TypeScriptexport class MyPanel extends Panel {
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
        if (message == 'drag') {
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
        } else if (message == 'cancelDrag') {
            this.viewport.cancelDraggingNewBlock();
        }
    }
}

iFrame code
In order to have the html in your iframe move as its being dragged, a few JavaScript functions need to be written. The following code should add the following behaviors:

The element they drag should move with the mouse cursor when they start dragging.
The element they drag should disappear from the panel when they move onto the canvas.
The element they drag should move back to its original location if the user completes or cancels the drag in any way.

📘The following code is only needed if you want to simulate the user dragging from your panel and onto the canvas (i.e. to drag around iframe HTML content).You could instead call the startDraggingNewBlock method after a button click, and dragging would start when the user's cursor hovered over the canvas.
HTML<link rel="stylesheet" type="text/css" href="./customUI.css">

<div
    class="square"
    onpointerdown="pointerDown(event)"
>
    Drag me
</div>

<script
    type="text/javascript"
    src="./customUI.js"
></script>

CSS.square {
    width: 100px;
    height: 100px;
    background: #ff0000;
}

TypeScript// Event that started the drag (coordinate anchor1).
let pointerDownEvent;

// As of the last pointer event, is the (captured) pointer outside the iframe's bounds?
let pointerIsOut = false;

function pointerDown(event) {
    pointerDownEvent = event;
    pointerIsOut = false;
    startDrag();
};

// Start listening for pointer events on this iframe to implement drag & drop.
function startDrag() {
    window.document.addEventListener('pointerup', documentPointerUp);
    window.document.addEventListener('pointermove', documentPointerMove);
};

// Cancel drag & drop, and reset the DOM back to how it began.
function stopDrag() {
    const target = pointerDownEvent?.target;
    if (target instanceof HTMLElement) {
        target.style.position = 'static';
        target.style.top = '';
        target.style.left = '';
        pointerDownEvent = undefined;
    }
    window.document.removeEventListener('pointerup', documentPointerUp);
    window.document.removeEventListener('pointermove', documentPointerMove);
    stopCanvasDrag();
};


function documentPointerUp(e) {
    if(pointerIsOut) {
        // Notify the editor that it needs to simulate canvas pointer events.
        parent.postMessage({message:'pointerup', x:e.pageX - window.scrollX, y:e.pageY - window.scrollY}, '*');
    }

    stopDrag();
};

function documentPointerMove(event) {
    const isInside = isInsideFrame(event);

    if(!pointerIsOut && !isInside) {
        startCanvasDrag();
    } else if(pointerIsOut && isInside) {
        // If the pointer has re-entered the iframe while dragging, tell the extension to
        // cancel the ongoing interaction for dragging the new block out.
        stopCanvasDrag();
    }

    pointerIsOut = !isInside;

    //While dragging the HTML element around, move it around
    //with relative positioning to keep it attached to the pointer cursor.
    const target = pointerDownEvent.target;
    if (target instanceof HTMLElement) {
        target.style.position = 'relative';
        target.style.top = event.pageY - pointerDownEvent.pageY + 'px';
        target.style.left = event.pageX - pointerDownEvent.pageX + 'px';
    }

    if(isInside) {
        // Defense in depth: If somehow the pointer buttons have been released and the user
        // is moving the pointer over this iframe again, cancel any ongoing drag operation.
        if (event.buttons == 0) {
            stopDrag();
        }
    }
    else {
        // Notify the editor that it needs to simulate canvas pointer events.
        parent.postMessage({message:'pointermove', x:event.pageX - window.scrollX, y:event.pageY - window.scrollY}, '*');
    }
};

function startCanvasDrag() {
    parent.postMessage({message: 'drag'}, '*');
    window.addEventListener('message', windowMessage);
};

function stopCanvasDrag() {
    window.removeEventListener('message', windowMessage);
    parent.postMessage({message:'cancelDrag'}, '*');
};

function isInsideFrame(event) {
    const x = event.pageX - window.scrollX;
    const y = event.pageY - window.scrollY;
    return x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight;
};

// If you have asked the extension to start a drag-new-block interaction, you need
// to listen for a message indicating that interaction has completed (either
// successfully or not) in order to reset the drag/drop state entirely.
function windowMessage(event) {
    if (event.data === 'dragDone') {
        stopDrag();
    }
};
