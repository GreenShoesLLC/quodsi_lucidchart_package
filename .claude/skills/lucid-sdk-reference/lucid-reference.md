# Lucid SDK Complete API Reference

This document provides comprehensive API documentation for the Lucid Extension SDK.

---

## Table of Contents

1. [EditorClient](#editorclient)
2. [DocumentProxy](#documentproxy)
3. [PageProxy](#pageproxy)
4. [BlockProxy](#blockproxy)
5. [LineProxy](#lineproxy)
6. [CustomBlockProxy](#customblockproxy)
7. [Viewport](#viewport)
8. [Panel](#panel)
9. [Modal](#modal)
10. [Menu](#menu)
11. [Data Import & Sync](#data-import--sync)
12. [Extension Package Structure](#extension-package-structure)

---

## EditorClient

The main entry point for interacting with the Lucid editor.

### Constructor

```typescript
const client = new EditorClient();
```

### Document Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getDocument()` | `Promise<Document>` | Get the current document |
| `getDocuments()` | `Promise<Document[]>` | Get all open documents |
| `createDocument(options)` | `Promise<Document>` | Create a new document |
| `openDocument(documentId)` | `Promise<void>` | Open an existing document |
| `closeDocument(documentId)` | `Promise<void>` | Close a document |
| `importPage(documentId, pageNums)` | `Promise<void>` | Import pages from another document |

### Shape Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `loadBlockClasses(classNames)` | `Promise<void>` | Load block classes before creating shapes |
| `getCustomShapeDefinition(library, shape)` | `Promise<BlockDefinition>` | Get definition for custom shape |

### Action Registration

| Method | Description |
|--------|-------------|
| `registerAction(name, callback)` | Register a named action for menus/UI |

### Selection Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getSelection()` | `Promise<Selection>` | Get current selection |
| `setSelection(shapeIds)` | `Promise<void>` | Set the current selection |

### Event Methods

| Method | Description |
|--------|-------------|
| `on(eventName, callback)` | Register event listener |
| `off(eventName, callback)` | Remove event listener |

### OAuth XHR Methods

```typescript
// Make authenticated API requests
client.oauthXHR.get(url, options)
client.oauthXHR.post(url, data, options)
client.oauthXHR.put(url, data, options)
client.oauthXHR.delete(url, options)
client.oauthXHR.patch(url, data, options)
```

### Example

```typescript
const client = new EditorClient();

async function init() {
    // Load block classes first
    await client.loadBlockClasses(['ProcessBlock']);

    // Register actions
    client.registerAction('myAction', () => {
        console.log('Action triggered');
    });

    // Get document
    const document = await client.getDocument();
    console.log('Document ID:', document.id);
}

init();
```

---

## DocumentProxy

Provides access to document content and properties.

### Constructor

```typescript
const document = new DocumentProxy(client);
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Document unique identifier |
| `pages` | `Map<string, PageProxy>` | All pages in the document |
| `properties` | `PropertyStore` | Document-level properties |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `properties.get(key)` | `any` | Get a document property |
| `properties.set(key, value)` | `void` | Set a document property |

### Example

```typescript
const client = new EditorClient();
const document = new DocumentProxy(client);

// Store data on document
document.properties.set('myKey', { foo: 'bar' });

// Retrieve data
const data = document.properties.get('myKey');

// Iterate pages
for (const [pageId, page] of document.pages) {
    console.log(pageId, page.getTitle());
}
```

---

## PageProxy

Represents a page in the document.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Page unique identifier |
| `blocks` | `Map<string, BlockProxy>` | Direct child blocks |
| `allBlocks` | `Map<string, BlockProxy>` | All blocks including nested |
| `lines` | `Map<string, LineProxy>` | All lines on the page |
| `groups` | `Map<string, GroupProxy>` | All groups on the page |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getTitle()` | `string` | Get page title |
| `setTitle(title)` | `void` | Set page title |
| `addBlock(options)` | `BlockProxy` | Add a new block |
| `addLine(options)` | `LineProxy` | Add a new line |
| `getAllBlocks()` | `BlockProxy[]` | Get all blocks |
| `getAllLines()` | `LineProxy[]` | Get all lines |

### Adding a Block

```typescript
async function createBlock(page: PageProxy, x: number, y: number) {
    await client.loadBlockClasses(['ProcessBlock']);

    const block = page.addBlock({
        className: 'ProcessBlock',
        boundingBox: { x, y, w: 200, h: 160 }
    });

    block.textAreas.set('Text', 'New Shape');
    return block;
}
```

### Adding a Line

```typescript
function connectBlocks(block1: BlockProxy, block2: BlockProxy) {
    block1.getPage().addLine({
        endpoint1: {
            connection: block1,
            linkX: 0.5,  // Center X
            linkY: 1,    // Bottom
        },
        endpoint2: {
            connection: block2,
            linkX: 0.5,  // Center X
            linkY: 0,    // Top
        },
    });
}
```

---

## BlockProxy

Represents a shape/block on the canvas.

### Hierarchy

```
ElementProxy
  └── ItemProxy
      └── BlockProxy
          ├── CustomBlockProxy
          ├── ERDBlockProxy
          ├── CardBlockProxy
          └── TableBlockProxy
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Block unique identifier |
| `properties` | `PropertyStore` | Block properties |
| `textAreas` | `Map<string, string>` | Text content areas |
| `textStyles` | `Map<string, TextStyle>` | Text styling |
| `shapeData` | `DataProxy` | Shape-specific data |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getClassName()` | `string` | Get the block class name |
| `getPage()` | `PageProxy` | Get the containing page |
| `getBoundingBox()` | `BoundingBox` | Get position and size |
| `setBoundingBox(box)` | `void` | Set position and size |
| `setLocation(x, y)` | `void` | Move the block |
| `offset(dx, dy)` | `void` | Move relative to current position |
| `delete()` | `void` | Remove the block |
| `toFront()` | `void` | Bring to front |
| `toBack()` | `void` | Send to back |

### Working with Text

```typescript
// Read text areas
for (const [key, text] of block.textAreas) {
    console.log(`${key}: ${text}`);
}

// Set text
block.textAreas.set('Text', 'New content');

// Style text (async)
await block.textStyles.set('Text', {
    [TextMarkupNames.Bold]: true,
    [TextMarkupNames.Size]: 14,
});
```

### Working with Properties

```typescript
// Set fill color
block.properties.set('FillColor', '#ff0000ff');

// Get property
const color = block.properties.get('FillColor');
```

### Working with Shape Data

```typescript
// Store custom data on shape
block.shapeData.set('simulationId', 'activity-123');
block.shapeData.set('modelData', JSON.stringify(activityModel));

// Retrieve data
const id = block.shapeData.get('simulationId');
const model = JSON.parse(block.shapeData.get('modelData'));
```

---

## LineProxy

Represents a connector/line between shapes.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Line unique identifier |
| `textAreas` | `Map<string, string>` | Text on the line |
| `endpoint1` | `Endpoint` | Start endpoint |
| `endpoint2` | `Endpoint` | End endpoint |

### Endpoint Object

```typescript
interface Endpoint {
    connection?: BlockProxy | LineProxy;  // Connected item
    linkX: number;  // 0-1, position on connected item
    linkY: number;  // 0-1, position on connected item
    x?: number;     // Absolute X if not connected
    y?: number;     // Absolute Y if not connected
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getTextAreaPosition(key)` | `TextPosition` | Get text position on line |
| `addTextArea(key, text, position)` | `void` | Add text to line |
| `deleteTextArea(key)` | `void` | Remove text from line |

### Text Position

```typescript
interface TextPosition {
    location: number;  // 0-1 along the line
    side: number;      // 0=on line, -1=left, 1=right
}
```

### Example

```typescript
function dumpLineText(page: PageProxy) {
    for (const [lineId, line] of page.lines) {
        for (const [key, text] of line.textAreas) {
            const position = line.getTextAreaPosition(key);
            if (position) {
                console.log(`Text: ${text}, Side: ${position.side}`);
            }
        }
    }
}
```

---

## CustomBlockProxy

Extended BlockProxy for custom shapes from shape libraries.

### Static Properties

```typescript
class MyCustomBlock extends CustomBlockProxy {
    public static library = 'my-shape-library';
    public static shape = 'my-custom-shape';
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isFromStencil(library, shape)` | `boolean` | Check if from specific stencil |
| `getStencilTextAreaName(name)` | `string` | Get actual text area name |

### Registering Custom Block Classes

```typescript
export class ActivityBlock extends CustomBlockProxy {
    public static library = 'quodsi_shape_library';
    public static shape = 'Activity';

    public getActivityName(): string {
        const taName = this.getStencilTextAreaName('Name');
        return taName ? this.textAreas.get(taName) || '' : '';
    }

    public setActivityName(name: string): void {
        const taName = this.getStencilTextAreaName('Name');
        if (taName) {
            this.textAreas.set(taName, name);
        }
    }
}

// Register so SDK uses this class for Activity shapes
CustomBlockProxy.registerCustomBlockClass(ActivityBlock);
```

### Finding Custom Shapes

```typescript
function findQuodsiActivities(page: PageProxy): CustomBlockProxy[] {
    const activities: CustomBlockProxy[] = [];

    for (const [blockId, block] of page.allBlocks) {
        if (block instanceof CustomBlockProxy) {
            if (block.isFromStencil('quodsi_shape_library', 'Activity')) {
                activities.push(block);
            }
        }
    }

    return activities;
}
```

### Creating Custom Shapes

```typescript
async function createCustomBlock(
    page: PageProxy,
    libraryName: string,
    shapeName: string
) {
    const customBlockDef = await client.getCustomShapeDefinition(
        libraryName,
        shapeName
    );

    if (!customBlockDef) {
        console.error('Shape not found');
        return null;
    }

    const customBlock = page.addBlock(customBlockDef);
    customBlock.textAreas.set('Text', 'My Custom Shape');
    return customBlock;
}
```

---

## Viewport

Manages the view state and selection.

### Constructor

```typescript
const viewport = new Viewport(client);
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getCurrentPage()` | `PageProxy` | Get currently visible page |
| `getSelectedItems()` | `ItemProxy[]` | Get selected items |
| `getVisibleRect()` | `Rect` | Get visible viewport area |
| `zoomToFit()` | `void` | Zoom to fit content |
| `scrollToItem(item)` | `void` | Scroll item into view |

### Example

```typescript
const client = new EditorClient();
const viewport = new Viewport(client);

// Get selection
const selection = viewport.getSelectedItems();
console.log(`${selection.length} items selected`);

// Create shape relative to viewport
const visibleRect = viewport.getVisibleRect();
const block = page.addBlock({
    className: 'ProcessBlock',
    boundingBox: {
        x: visibleRect.x + 100,
        y: visibleRect.y + 100,
        w: 200,
        h: 160
    }
});
```

---

## Panel

Creates docked UI panels (right dock in Lucidchart).

### Constructor Options

```typescript
interface PanelOptions {
    title: string;
    iconUrl: string;
    location: PanelLocation;
    url?: string;           // URL to HTML content
    content?: string;       // Inline HTML content
    persist?: boolean;      // Keep panel alive
}
```

### PanelLocation

```typescript
enum PanelLocation {
    RightDock = 'rightDock',
    // Others available for Lucidspark
}
```

### Creating a Panel

```typescript
import { EditorClient, Panel, PanelLocation } from 'lucid-extension-sdk';

class ModelPanel extends Panel {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Model Editor',
            iconUrl: 'data:image/png;base64,...',  // Base64 recommended
            location: PanelLocation.RightDock,
            url: 'quodsim-react/index.html',
            persist: true,  // Keep running in background
        });
    }

    // Handle messages from iframe
    protected messageFromFrame(message: JsonSerializable): void {
        console.log('Received:', message);

        if (message.type === 'SAVE_REQUEST') {
            this.handleSave(message.data);
        }
    }

    // Send message to iframe
    public sendUpdate(data: any): void {
        this.sendMessage({ type: 'DATA_UPDATE', payload: data });
    }
}

const client = new EditorClient();
const panel = new ModelPanel(client);
```

### Panel Content Location

Place HTML files in the `public` folder:

```
my-package/
├── public/
│   └── index.html
│   └── quodsim-react/
│       └── index.html
├── editorextensions/
└── manifest.json
```

### Message Passing: Extension → Panel

```typescript
// In Panel class
this.sendMessage({ type: 'UPDATE', data: payload });
```

### Message Passing: Panel → Extension

```typescript
// In React/iframe code
parent.postMessage({ type: 'SAVE', data: payload }, '*');

// Listen in React
window.addEventListener('message', (event) => {
    const { type, data } = event.data;
    // Handle message
});
```

### Lucid Styles

Include Lucid's stylesheet for consistent styling:

```html
<link rel="stylesheet" href="https://lucid.app/public-styles.css">

<button class="lucid-styling primary">Primary</button>
<button class="lucid-styling secondary">Secondary</button>
<input type="text" class="lucid-styling">
```

---

## Modal

Creates dialog windows.

### Constructor Options

```typescript
interface ModalOptions {
    title: string;
    width: number;
    height: number;
    url?: string;
    content?: string;
}
```

### Creating a Modal

```typescript
import { EditorClient, Modal } from 'lucid-extension-sdk';

class ImportModal extends Modal {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Import Data',
            width: 600,
            height: 400,
            url: 'import.html',
        });
    }

    protected messageFromFrame(message: JsonSerializable): void {
        if (message.action === 'close') {
            this.hide();
        }
    }
}

// Show the modal
client.registerAction('showImport', () => {
    const modal = new ImportModal(client);
    modal.show();
});
```

---

## Menu

Adds menu items to Lucid's menus.

### Menu Locations

| Location | Description |
|----------|-------------|
| `MenuLocation.File` | File menu |
| `MenuLocation.Edit` | Edit menu |
| `MenuLocation.View` | View menu |
| `MenuLocation.Extension` | Extension menu (default) |

### Adding Menu Items

```typescript
import { EditorClient, Menu, MenuLocation } from 'lucid-extension-sdk';

const client = new EditorClient();
const menu = new Menu(client);

// Dropdown menu item
menu.addDropdownMenuItem({
    label: 'My Action',
    action: 'myAction',
    location: MenuLocation.Edit,
});

// Context menu item (right-click)
menu.addContextMenuItem({
    label: 'Turn Red',
    action: 'makeRed',
    visibleAction: 'canMakeRed',  // Controls visibility
});
```

### Conditional Menu Items

```typescript
// Register visibility check
client.registerAction('canMakeRed', () => {
    const selection = viewport.getSelectedItems();
    return selection.length > 0;
});

// Register action
client.registerAction('makeRed', () => {
    for (const item of viewport.getSelectedItems()) {
        item.properties.set('FillColor', '#ff0000ff');
    }
});

// Menu item only visible when items selected
menu.addContextMenuItem({
    label: 'Turn Red',
    action: 'makeRed',
    visibleAction: 'canMakeRed',
});
```

---

## Data Import & Sync

### Overview

Data import enables pulling data from external sources into Lucid and syncing changes back.

### Components

| Component | Purpose |
|-----------|---------|
| Editor Extensions | Manage data display and behavior |
| Data Connectors | Auto-fetch/push data to external APIs |
| Shape Libraries | Custom shapes for data display |

### Capabilities

- Pull data from external APIs
- Update element properties (text, color, etc.)
- Sync changes back to external source
- Batch updates for user review

### Limitations

- Doesn't work with built-in org charts/timelines
- Best with tabular data formats
- Non-tabular data requires more work

---

## Extension Package Structure

### Directory Layout

```
my-package/
├── editorextensions/
│   └── my-extension/
│       ├── src/
│       │   └── extension.ts
│       ├── package.json
│       └── tsconfig.json
├── shapelibraries/
│   └── my-shapes/
│       └── shapes/
├── dataconnectors/
│   └── my-connector/
├── public/
│   └── index.html
├── manifest.json
└── .gitignore
```

### manifest.json

```json
{
  "id": "your-package-id",
  "version": "1.0.0",
  "extensions": [
    {
      "name": "my-extension",
      "title": "My Extension",
      "products": ["chart", "spark"],
      "codePath": "editorextensions/my-extension/bin/extension.js",
      "scopes": [
        "READ",
        "WRITE",
        "SHOW_MODAL",
        "CUSTOM_UI",
        "NETWORK"
      ]
    }
  ],
  "shapeLibraries": [],
  "oauthProviders": [],
  "dataConnectors": []
}
```

### Products

| Product ID | Application |
|------------|-------------|
| `chart` | Lucidchart |
| `spark` | Lucidspark |
| `teamspaces` | Team Spaces |

### CLI Commands

```bash
# Create new package
npx lucid-package@latest create

# Create editor extension
npm run create-editor-extension my-extension

# Test locally
npx lucid-package test-editor-extension my-extension

# Bundle for upload
npx lucid-package bundle
```

---

## Common Patterns & Best Practices

### Async Initialization

```typescript
const client = new EditorClient();

async function init() {
    // Load block classes first
    await client.loadBlockClasses(['ProcessBlock', 'DecisionBlock']);

    // Now safe to add UI
    const menu = new Menu(client);
    menu.addDropdownMenuItem({...});

    const panel = new MyPanel(client);
}

init();
```

### Batch Operations

```typescript
// Good: Batch property changes
const updates: Array<[string, any]> = [
    ['FillColor', '#ff0000'],
    ['StrokeColor', '#000000'],
    ['StrokeWidth', 2],
];

for (const [key, value] of updates) {
    block.properties.set(key, value);
}
```

### Error Handling

```typescript
try {
    const document = await client.getDocument();
    // ... operations
} catch (error) {
    console.error('Extension error:', error);
    // Show user-friendly error
}
```

### Clean Event Listeners

```typescript
class MyExtension {
    private selectionHandler = () => this.onSelectionChange();

    init() {
        client.on('selection:change', this.selectionHandler);
    }

    cleanup() {
        client.off('selection:change', this.selectionHandler);
    }
}
```

### Data Validation

```typescript
function validateShapeData(block: BlockProxy): boolean {
    const data = block.shapeData.get('modelData');
    if (!data) return false;

    try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object';
    } catch {
        return false;
    }
}
```

---

## Additional Resources

- **Official Docs**: https://developer.lucid.co/docs/
- **Extension API**: https://developer.lucid.co/extension-api/
- **Custom Shapes**: https://developer.lucid.co/custom-shapes/
- **Developer Portal**: https://lucid.app/developer
- **Local Docs**: `_docs/lucid_offline_sdk_docs/`
