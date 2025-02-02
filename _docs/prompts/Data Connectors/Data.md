# Data

## Add custom data fields to a shape
The easiest and simplest way to add data to a shape is to set custom shape data fields. You can do this by reading and writing from shapeData:
TypeScriptblock.shapeData.set('Value', 50);
const value = block.shapeData.get('Value');

## How to create data collections
If you want to have data sets shared between Lucidchart and your own systems, you'll want to have those data sets live independent of the shapes on the canvas. From editor extensions, you can create new collections of data that work like other imported data sets.
These data collections (think of each one as a spreadsheet or database table with a known schema) are organized into data sources. One data source typically represents one set of collections that are all related, e.g. "all the data from this one custom file import".
You can create a data source, collection, and data items like this. Note the second parameter to addDataSource—this is information about where the data came from. You can read this from your extension code in order to find the data source for the import you're interested in working with:

```typescript
const client = new EditorClient();
const data = new DataProxy(client);

function addData() {
    const source = data.addDataSource('my_data_source', {'origin': 'local'});
    const collection = source.addCollection('my_collection', {
        fields: [
            {name: 'id', type: ScalarFieldTypeEnum.NUMBER},
            {name: 'name', type: ScalarFieldTypeEnum.STRING},
        ],
        primaryKey: ['id'],
    });

    collection.patchItems({
        added: [
            {'id': 1, 'name': 'Ben Dilts'},
            {'id': 2, 'name': 'James Judd'},
            {'id': 3, 'name': 'Ryan Stringham'},
        ],
    });
}

function findData() {
    for (const [key, source] of data.dataSources) {
        if (source.getSourceConfig()['origin'] === 'local') {
            for (const [collectionId, collection] of source.collections) {
                if (collection.getName() === 'my_collection') {
                    return collection;
                }
            }
        }
    }
    return undefined;
}
```

## How to associate a record with a shape-on canvas
Once you have a data source and collection with the data you want to use, you can associate an entire record with a shape on-canvas by using a reference key. Reference keys are displayed in Lucidchart near the custom shape data fields.
To create a reference key, you need the ID of the collection and the primary key of the data item you want to link:

```typescript
block.setReferenceKey('my_reference_key', {
    collectionId: collection.id,
    primaryKey: '1',
    readonly: true,
});
```

The primary keys of data items are accessible both as the keys on the collection.items, as well as on each item itself:

```typescript
for(const [primaryKey, item] of collection.items) {
    assert(item.primaryKey === primaryKey);
}
```

Using reference keys to data items is the best long-term way to associate upstream data with a shape in a diagram. This is how we associate source data with shapes in all first-party integrations.

## Enabling graphics for shapes connected to data
Once you have shapes connected to data it may be helpful to display the state of the imported data with respect to the external data source. For example, a sync with the external data source may have failed in which case it is desirable to show the user an error state on shapes linked to this data.

Some shapes may display an icon indicating the state of the data connected to it by default, however, for most shapes, this functionality needs to be enabled by the extension:

```typescript
const position: BadgeEnumPosition = {
    horizontalPos: HorizontalBadgePos.LEFT,
    verticalPos: VerticalBadgePos.BOTTOM,
    layer: BadgeLayerPos.INSIDE,
    responsive: BadgeResponsiveness.STACK,
};
block.setDataSyncStateIconPosition(position);
```

## List local data changes
Often, data imported from a third-party source, either using a standard Lucid feature like CSV or Google Sheets import, or via a custom data connector, is editable by the end user. If the data is edited in any way--by editing data-bound text fields, using the Data Panel or other UI, or even via the Extension API--those changes are tracked until they are synced back to the original data source.
To access the list of locally-changed data items on a collection, if any, call CollectionProxy.getLocalChanges. That method returns undefined if the collection is not configured to track local changes separately from the initially-imported data.
Here is some simple code that will examine the currently-selected shape for linked data, then log a full list of all local changes to the associated data collection to the console. If you import an org chart, then make edits to that data by moving people around the organization, adding new people, or removing some people, the dump-changes action defined in this example would provide a log of all of your changes in the console:

```typescript
import {EditorClient, Menu, MenuType, Viewport, CollectionProxy} from 'lucid-extension-sdk';

const client = new EditorClient();
const menu = new Menu(client);
const viewport = new Viewport(client);

client.registerAction('dump-changes', async () => {
    for (const item of viewport.getSelectedItems()) {
        // Look for a data reference associated with a data collection
        const collectionId = item.referenceKeys.first()?.collectionId;
        if (collectionId) {
            // Validate that the reference is a "branch", meaning it is tracking
            // local changes independent of the original imported data.
            const branch = new CollectionProxy(collectionId, client);
            if (branch.getBranchedFrom()) {
                const changes = branch.getLocalChanges();
                if (changes) {
                    console.log('ADDED');
                    for (const item of changes.getAddedItems()) {
                        console.log(item.primaryKey);
                        for (const [key, val] of item.fields) {
                            console.log(key, val);
                        }
                    }

                    console.log('DELETED');
                    for (const item of changes.getDeletedItems()) {
                        console.log(item.primaryKey);
                        for (const [key, val] of item.fields) {
                            console.log(key, val);
                        }
                    }

                    console.log('CHANGED');
                    for (const item of changes.getChangedItems()) {
                        console.log(item.primaryKey);
                        for (const key of item.changedFields) {
                            console.log(key, item.original.fields.get(key), item.fields.get(key));
                        }
                    }
                }
            }
        }
    }
});

menu.addDropdownMenuItem({
    label: 'Dump changes',
    action: 'dump-changes',
});
```

## Bootstrap data for documents created via API
Our public API for creating a document and Lucid Standard Import file type support the ability to include bootstrap data that's readable by a specific editor extension.
Alongside the other data you send in the body of the POST, you can include extensionBootstrapData which specifies the extension package that the data is intended for, the name of the editor extension in that package that should read this particular bootstrap data, a minimum version number for that package to be allowed to read the data, and then the data payload itself.
For example, a full create document request body could look like this:

```json
{
  "title": "new document title",
  "product": "lucidchart",
  "extensionBootstrapData": {
    "packageId": "74672098-cf36-492c-b8e6-2c4233549cd3",
    "extensionName": "sheets-adapter",
    "minimumVersion": "1.4.0",
    "data": {
      "a": 1,
      "b": 2
    }
  }
}
```
Because you must specify a packageId on bootstrap data, remember to specify id in your package manifest.
You can then access and process this bootstrap data as follows from your editor extension code:

```typescript
client.processAndClearBootstrapData((data) => {
    // here, data would be {a:1, b:2}
});
```

In that bootstrap callback, you can operate on the data immediately, or you can do asynchronous operations. If the callback returns a Promise (or you mark it async), the bootstrap data won't be cleared off the document until that promise successfully resolves.
To verify that bootstrap data processing works, you can directly set the "Bootstrap" property on the document and then refresh the page:
```typescript
new DocumentProxy(client).properties.set('Bootstrap', {
    'PackageId': '74672098-cf36-492c-b8e6-2c4233549cd3',
    'ExtensionName': 'sheets-adapter',
    'MinimumVersion': '1.4.0',
    'Data': {
        'a': 1,
        'b': 2,
    },
});
```

## Marking an extension as required for a document
The processAndClearBootstrapData function also allows you to pass in an optional boolean value that, if true, marks the document as requiring the extension. Once marked, if the extension is not installed the user will be notified about the extension being required on document load:
TypeScriptclient.processAndClearBootstrapData((data) => {}, true);


The minimum extension version required by document is the minimumVersion provided in the request body when creating the document:
📘Only extensions with bootstrap data available to them will be allowed to mark themselves as required for a document.

```typescript
new DocumentProxy(client).properties.set('Bootstrap', {
    'PackageId': '74672098-cf36-492c-b8e6-2c4233549cd3',
    'ExtensionName': 'sheets-adapter',
    'MinimumVersion': '1.4.0',
    'Data': {
        'a': 1,
        'b': 2,
    },
});
```