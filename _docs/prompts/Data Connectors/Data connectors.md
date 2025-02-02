 # Data connectors

Data connectors can be created automatically using the npm run command which is a wrapper forcreate-data-connector command of the lucid-package CLI tool:
Shellnpm run create-data-connector my-data-connector

## Data connector file structure
A data connector is structured like this:

The actions folder is where the implementation for each of your action handlers will go. These are called when your editor extension calls performDataAction.
index.tsis the entry point for your data connector. This is where you will define which actions your data connector supports.
debug-server.ts is a utility for running your data connector locally during development.
package.json and tsconfig.json define environment settings for your data connector.

## Data connector manifest
To add a data connector to your extension package, you will need to declare it in your manifest.json file.
📘If you used the lucid-package CLI tool to create your data connector, your manifest.json file will be updated automatically to include the new data connector manifest.
Here is an example of what a data connector manifest entry might look like:

```json
manifest.json{
  // ...

  "dataConnectors": [
    {
      "name": "my-data-connector",
      "oauthProviderName": "oauth",
      "callbackBaseUrl": "https://www.example.com/",
      "dataActions": {
        "Import": "import"
      }
    }
  ]
}
```
A data connector manifest should have the following fields:

name: The name of the data connector. This will be referenced by your editor extension code to specify which data connector you are using for a request.

oauthProviderName: The name of an OAuth provider that is defined in the extension package. When a request is made to the data connector, it will include the OAuth access token for the user who initiated the request so that your data connector can query an OAuth API on behalf of the user.

callbackBaseUrl: The base URL your data connector is hosted at.

dataActions: The data actions that your data connector supports, and the url suffix that should be added to the base url when the data action is invoked by the editor extension. In the above example, the data connector supports one action (Import), and requests will be made to https://www.example.com/import when the editor extension invokes that action.

## Building a data connector

You may need to access data from a source not already supported by Lucid. In order to do this, you have two choices:

Fetch data using EditorClient.oauthXhr and add it to the document by creating data sources and collections in your extension as described here.

Create a data connector which can access and manage data in response to requests from Lucid's servers, and add the data connector to your extension.

For simple integrations, the first approach may be entirely sufficient. However, if you want your data to update when changes are made to it in Lucid documents, or if you want updates that happen in the data's source to be automatically reflected in Lucid documents, then you'll need to create a data connector.
A data connector is a collection of callback endpoints that translate between external representations of data and Lucid's representation. Data connectors are bidirectional, allowing for data updates to flow from external sources into Lucid documents and from Lucid documents back to their external sources. A data connector must provide at least one URL at which it can respond to requests made by Lucid's servers.
When Lucid makes a request to your data connector, it will come in the form of a data action. Data actions are triggered either explicitly by code in your extension, or automatically based on user interactions with Lucid documents. Each data action has a name, a callback url suffix, an OAuth token for accessing the data on behalf of the requesting user, and other information that is relevant to fulfilling the user's request.
To add a data connector to your extension you must:

Declare your data connector in your manifest.json.
Implement your data connector.
Expose a URL Lucid's servers can use to make requests to your data connector.

## Declare your data connector
To declare a data connector, include an array of dataConnectors in your manifest.json. Each data connector must contain the following:

| Field              | Description                                                                          | Example                     |
|--------------------|--------------------------------------------------------------------------------------|-----------------------------|
| name               | The name you will use to refer to this data connector in your extension              | DemoDataConnector           |
| oauthProviderName  | The name of an OAuth provider defined in your manifest.json                          | asana                       |
| callbackBaseUrl    | The base URL Lucid will send callback events to                                      | https://www.example.com/     |
| dataActions        | A mapping of the data actions supported by this data connector to the URL suffix that should be appended to the callbackBaseUrl when making requests for that type of data action. | {"Import" : "import"}       |

Any time you add or update declarations for any data connectors, you will need to package and upload your manifest, then install the extension for yourself again before your data connector can be used by your extension.
## Implement your data connector
As an example, let's start with an "Import" data action which instructs the data connector what data to import onto a document.
To trigger an "Import" data action from your extension, call performDataAction on the EditorClient in lucid-extension-sdk:
/demo-extension-package/editorextensions/demo-extension/src/index.tsconst client = new EditorClient();
client.performDataAction({
    dataConnectorName: 'DemoDataConnector',
    actionName: 'Import',
    actionData: {'requestedItems': ['id-1', 'id-2']},
    asynchronous: true,
});

If your manifest.json defines callbackBaseUrl = https://www.example.com/ and dataActions = {"Import" : "import"}, Lucid will make a POST request to https://www.example.com/import with a data action as the request body. The data action will include {'requestedItems': ['id-1', 'id-2']} in its data, and because the action was called with asynchronous: true it will also include a token that can be used to POST the requested data back to Lucid. Additionally, the data action will include an OAuth access token that can be used to access the data on behalf of the user who triggered the data action. The access token can be found in the body of the data action under action.context.userCredential as well as in the Authorization header of the request.
For your convenience, the lucid-extension-sdk provides helpful wrappers for implementing your data connector that will handle request signature validation, data action routing, and more. The data connector itself can be defined using the DataConnector class. Request handling for data actions can be added by calling either defineAsynchronousAction, or defineAction on the Data connector, and providing the implementation for data actions with a specified name:

```typescript
TypeScriptnew DataConnector(new DataConnectorClient(cryptoDependencies)).defineAsynchronousAction('Import', async (action) => {
    const client = action.client; // <- an authorized client for sending data back to the document
    const actionName = action.name; // <- "Import"
    const actionData = action.data; // <- {'requestedItems': ['id-1', 'id-2']}
    const userCredential = action.context.userCredential; // <- the OAuth access token for the user who triggered the data action
});
```

To add a new collection to the document containing the requested items, you must first define what the data will look like using a schema. For this example, you will use data of the following type:

```typescript
TypeScripttype MyItemType = {id: string; name: string; age: number; isSingle: boolean};
```

You can define the schema for your data by calling declareSchema and specifying the types for each of the fields in your data:

```typescript
TypeScriptconst myCollectionSchema = declareSchema({
    primaryKey: ['id'],
    fields: {
        'id': {type: ScalarFieldTypeEnum.STRING},
        'name': {type: ScalarFieldTypeEnum.STRING},
        'age': {type: ScalarFieldTypeEnum.NUMBER},
        'isSingle': {type: ScalarFieldTypeEnum.BOOLEAN},
    },
});

// Infer the TS type:
type MyItemType = ItemType<typeof myCollectionSchema.example>;

let dataItem: MyItemType = {id: 'id-1', name: 'John', age: 30, isSingle: true};
```

To fulfill the import request, retrieve the data that was requested, then use the authorized client provided to post the data back to the document:

```typescript
TypeScriptconst makeDataConnector(
    client: DataConnectorClient,
) => {
    return new DataConnector(client).defineAsynchronousAction('Import', async (action) => {
        const itemsToAdd: MyItemType[] = [
            {id: 'id-1', name: 'John Doe', age: 30, isSingle: true},
            {id: 'id-2', name: 'Jane Doe', age: 31, isSingle: true},
        ];

        action.client.update({
            dataSourceName: 'Demo Data Source',
            collections: {
                'My Collection': {
                    schema: {
                        fields: myCollectionSchema.array,
                        primaryKey: myCollectionSchema.primaryKey.elements,
                    },
                    patch: {
                        items: myCollectionSchema.fromItems(itemsToAdd),
                    },
                },
            },
        });
    });
}
```

## Field labels
When fields are displayed in the card details panels, or in other visualizations, the field name will be used as the label for the field. You can specify the labels that will be used by providing a custom label as part of the schema while adding a collection. This is done by adding a collection to a data source that has been imported. Include the fields from the source you want to display, specify which field is the primary key, then add field labels for any field names you want to override:

```typescript
TypeScriptsource.addCollection('track-tickets', {
    fields: [
        {name: 'id', type: ScalarFieldTypeEnum.STRING},
        {name: 'description', type: ScalarFieldTypeEnum.STRING},
        {name: 'assigned', type: [ScalarFieldTypeEnum.STRING, ScalarFieldTypeEnum.NULL]},
        {name: 'state', type: [ScalarFieldTypeEnum.STRING, ScalarFieldTypeEnum.NULL]},
    ],
    primaryKey: ['id'],
    fieldLabels: {
        'id': 'Ticket',
        'description': 'Description',
        'assigned': 'Assigned',
        'state': 'State',
    },
});
```

## Lucid Fields
Lucid defines a set of fields to provide consistent meaning across data sources when those data sources use different names for the same concepts.
For example, Jira calls the status field on their tasks "state", while Azure DevOps calls the status field on their tasks "status".
Conceptually, both fields mean the same thing and should be treated consistently by Lucid, even though their names differ in their respective data sources.
By applying a Lucid Field mapping to these fields, Lucid will recognize and treat those fields consistently, whether the task came from Jira or Azure DevOps.
Additionally, if you would like your data to work in some of Lucid's powerful visualizations like the timeline, you must assign Lucid fields to your data when specifying the schema.
For example:

```typescript
TypeScriptsource.addCollection('track-tickets', {
    fields: [
        {name: 'id', type: ScalarFieldTypeEnum.STRING},
        {name: 'description', type: ScalarFieldTypeEnum.STRING, mapping: [LucidFields.Description]},
        {name: 'assigned', type: [ScalarFieldTypeEnum.STRING, ScalarFieldTypeEnum.NULL], mapping: [LucidFields.User]},
        {name: 'state', type: [ScalarFieldTypeEnum.STRING, ScalarFieldTypeEnum.NULL], mapping: [LucidFields.Status]},
    ],
    primaryKey: ['id'],
});
```

The current Lucid Fields are:
```typescript
TypeScriptLucidFields {
    /**
     * Represents the title or main descriptor of an item.
     */
    Title = 'title',
    /**
     * Captures detailed information or a summary about an item.
     */
    Description = 'description',
    /**
     * Refers to the user associated with or assigned to an item.
     */
    User = 'user',
    /**
     * Specific to the reporting user, typically in the context of a ticketing system.
     */
    Reporter = 'user.reporter',
    /**
     * Refers to the time associated with an item.
     */
    Time = 'time',
    /**
     * Pertains to the ending or completion time of an item.
     */
    EndTime = 'time.endtime',
    /**
     * Contains estimations related to items, like time or resource estimates.
     */
    Estimate = 'estimate',
    /**
     * Reflects status of an item, typically in the context of a ticketing system.
     */
    Status = 'status',
    /**
     * Classifies the type of issue or item, typically in the context of a ticketing system.
     */
    IssueType = 'issuetype',
    /**
     * Indicates the importance or urgency level of an item.
     */
    Priority = 'priority',
    /**
     * Relates to the project with which an item is associated.
     */
    Project = 'project',
    /**
     * The unique URL or identifier linking back to the item’s source.
     */
    SourceItemUrl = 'url',
    /**
     * Refers to the URL of the image associated with this item
     */
    ImageUrl = 'url.image'
    /**
     * Represents the sprint or time interval this item is assigned to.
     */
    Sprint = 'sprint',
    /**
     * Refers to the team associated with or responsible for this item.
     */
    Team = 'team',
    /**
     * Refers to the parent item this item belongs to.
     */
    Parent = 'parent'
}
```

## Expose a URL for your data connector
The final step is to use your data connector to handle incoming requests by calling dataConnector.runAction:
TypeScriptconst response = await dataConnector.runAction(requestUrl, requestHeaders, requestBodyAsJson);

As an example, this code sets up a simple development server using node express that will accept and respond to requests made to your data connector:

```typescript
serve.jsimport {DataConnectorClient} from 'lucid-extension-sdk';
import {makeDataConnector} from './dataconnector';
import * as express from 'express';
import * as crypto from 'crypto';

const client = new DataConnectorClient({Buffer, crypto});
const dataConnector = makeDataConnector(client);
dataConnector.runDebugServer({express});
```
inline:shnode ./serve.js

You will need to expose the URL you are using to accept requests publicly so that Lucid's servers can send it requests.
## Examples
For a more thorough example, you can look at the source code for 2 different Lucid extensions that part of the SDK.

### Basic Data Connector example
C:\_source\Greenshoes\sample-lucid-extensions\data-connector-example\dataconnectors\data-connector-1
### Asana example
C:\_source\Greenshoes\sample-lucid-extensions\asana

# Data actions
Data actions are the backbone of a data connector. Data actions are invoked either explicitly by your editor extension, or in some cases automatically by Lucid’s server to help sync data changes. Data connectors declare which data actions they support, including things like importing data, refreshing data on open Lucid documents, and patching data changes made in Lucid back to an external data source.
Some actions are reserved, meaning that they are called outside of your extension when certain criteria are met. All other actions are custom, which means you are responsible for calling them somewhere within your extension. Here is a list of the current reserved actions:
| Action     | Description                                                                                      |
|------------|--------------------------------------------------------------------------------------------------|
| HardRefresh | Called after a document is closed for an extended period of time to refresh data on the document |
| Poll        | Called every 30 seconds when a document is open to refresh data on the document                  |
| Patch       | Called when users make changes to data on Lucid documents so those changes can be sent to the external data source |

## Registering data actions
Each action that your data connector supports needs to be declared within the data connector section of your manifest.json file:

```json
manifest.json{
    // ...

    "dataConnectors": [
        {
            "name": "my-data-connector",
            "oauthProviderName": "...",
            "callbackBaseUrl": "...",
            "dataActions": {
                "MyAction": "MyAction",
                "AnotherAction": "AnotherAction"
                // ...
            }
        }
    ]
}
```

You also have to append the actions to your data connector’s index.ts file:
/data-connector/index.tsimport {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';
```typescript
import {myAction} from './actions/myaction';
import {anotherAction} from './actions/anotheraction';

export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
    .defineAsynchronousAction("MyAction", myAction)
    .defineAsynchronousAction("AnotherAction", anotherAction)
```
It is important that the name you assign to the action in your index file matches the name in your manifest file. This is especially important for reserved data actions which are invoked by Lucid’s server (such as the hard refresh and poll actions).
## Calling data actions
After actions are created, you need to call them somewhere in your extension (unless they are called automatically by the SDK). This is done by using the performDataAction() method:

```typescript
TypeScriptawait editorClient.performDataAction({
    actionName: "MyAction"
    actionData: <Data>
    // ...
});
```

# Import action
An action you will likely want to create is an import action which pulls data from an external source, and posts that data to Lucid so it can be displayed on a Lucid document. How this is done will vary, but it might look something like this:

The import action is an example of a custom action, so you can name it whatever you want. For our example, we have named it “Import.”

```typescript
manifest.json{
    // ...

    "dataConnectors": [
        {
           //  ...

            "dataActions": {
                "Import": "Import"
            }
        }
    ]
}
```
/data-connector/index.tsimport {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';

```typescript
import {importAction} from './actions/importaction';

export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
    .defineAsynchronousAction("Import", importAction)
```
/data-connector/actions/importaction.tsimport {DataConnectorAsynchronousAction} from 'lucid-extension-sdk';
```typescript
// You would define these variables/methods depending on the structure of your data
import {CollectionName} from '...';
import {getFormattedCollection, collectionSchema} from '...';

export const importAction: (action: DataConnectorAsynchronousAction) => Promise<{success: boolean}> = async (
    action,
) => {
    const apiClient = new APIClient(...);

    // action.data will contain data passed to the data connector by your editor extension
    // It will be up to you to determine what data you need
    const collectionIds = action.data as string[];

    // Fetch the data
    const fullCollectionData = await apiClient.getCollections({ids: collectionIds});

    // Convert the data into a Lucid compatible format
    const formattedCollectionData = fullCollectionData.map(getFormattedCollection);

    // Send the imported data to Lucid
    await action.client.update({
        dataSourceName: 'dataSource',
        collections: {
            [CollectionName]: {
                schema: {
                    fields: collectionSchema.array,
                    primaryKey: collectionSchema.primaryKey.elements,
                },
                patch: {
                    items: collectionSchema.fromItems(formattedCollectionData),
                },
            },
        },
    });

    return {success: true};
};
```
# Hard refresh action
Hard refresh is called when a document is opened after it has been closed for more than 5 minutes.
Your hard refresh action should fetch the data that has already been imported into Lucid by using action.context.documentCollections, and then update that data on Lucid documents by posting it back to Lucid.
Your code might look something like this:

```json
manifest.json{
    // ...

    "dataConnectors": [
        {
           //  ...

            "dataActions": {
                "HardRefresh": "HardRefresh" // NOTE: since this is a reserved action, the name must be "HardRefresh"
            }
        }
    ]
}
```
/data-connector/index.tsimport {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';

```typescript
import {hardRefreshAction} from './actions/hardrefreshaction';

export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
    .defineAsynchronousAction("HardRefresh", hardRefreshAction)

/data-connector/actions/hardRefreshAction.tsimport {DataConnectorAsynchronousAction} from 'lucid-extension-sdk';
import {isString} from 'lucid-extension-sdk/core/checks';

// You would define these variables/methods depending on the structure of your data
import {CollectionName} from '...';
import {getFormattedCollection, collectionSchema} from '...';

export const hardRefreshAction: (action: DataConnectorAsynchronousAction) => Promise<{success: boolean}> = async (
    action
) => {
    const apiClient = new APIClient(...);

    // Find the data that is already on the document
    let collectionIds: string[] = [];
    Object.keys(action.context.documentCollections).forEach((key) => {
        if (key.includes('Collection')) {
            collectionIds = collectionIds.concat(
                action.context.documentCollections?.[key].map((collectionId) => JSON.parse(collectionId)).filter(isString),
            );
        }
    });

    // If there is no data, you shouldn't need to update anything
    if (collectionIds.length == 0) {
        return {success: true};
    }

    // Fetch the data of the collections on the document
    const fullCollectionData = await apiClient.getCollections({ids: collectionIds});

    // Convert the data into a Lucid compatible format
    const formattedCollectionData = fullCollectionData.map(getFormattedCollection);

    // Send the updated collections to Lucid
    await action.client.update({
        dataSourceName: 'dataSource',
        collections: {
            [CollectionName]: {
                schema: {
                    fields: collectionSchema.array,
                    primaryKey: collectionSchema.primaryKey.elements,
                },
                patch: {
                    items: collectionSchema.fromItems(formattedCollectionData),
                },
            },
        },
    });

    return {success: true};
};
```

You do not need to directly call the hard refresh action in your extension. Hard refresh is a reserved action and is invoked automatically by Lucid’s server at the appropriate times.

# Poll action
The poll action refreshes all of the data on a Lucid document periodically. Polling achieves the same thing as the hard refresh action, but runs every 30 seconds while the Lucid documents are open. In most cases you can reuse the code you wrote for the hard refresh action, as both strategies update your data the same way. The poll action is distinct in that it can refresh data on multiple documents at once, whereas the hard refresh action only refreshes data on a single document. If you have implemented the Hard Refresh action, your code might look something like this:
```json
manifest.json{
    // ...

    "dataConnectors": [
        {
           //  ...

            "dataActions": {
                "Poll": "Poll" // NOTE: since this is a reserved action, the name must be "Poll"
            }
        }
    ]
}
```

/data-connector/index.tsimport {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';

```typescript
import {hardRefreshAction} from './actions/hardRefreshAction';

export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
    .defineAsynchronousAction("Poll", hardRefreshAction)
```
You do not need to directly call the poll action in your extension. Poll is a reserved action and is invoked automatically by Lucid’s server at the appropriate times.

# Data connector security
Data connectors and the data they manage are secured through two means:

Request signatures to validate requests to your data connector originated from Lucid's servers.
Data update tokens authorize your data connector to update specific Lucid documents with data.

Because data connectors use OAuth 2.0 user access tokens to communicate with third parties, make sure you're also aware of how we secure OAuth 2.0 tokens.
## Request signatures
For your security, Lucid provides a request signature header (X-RSA-Signature) on all requests sent to data connectors. The signature can be used by data connectors to validate that incoming requests are legitimate traffic coming from Lucid. The signature is a concatenation of the request body and the query parameters.
Lucid signs requests using the RS384 algorithm. A full list of Lucid's public keys can be found here in JWKS format, and individual keys can be found by their IDs in PEM format at https://lucid.app/.well-known/pem/TPCP.

## Validation
If you use the DataConnector class from the lucid-extension-sdk to implement your data connector, request validation is performed automatically for you.
If you would like to validate the requests yourself, you can follow this Node.js example:
TypeScriptconst crypto = require('crypto');

```typescript
const parts = request.uri.split('?')
const params = parts.length > 0 ? parts[1] : "";
const nonce = request.headers['X-Lucid-RSA-Nonce'];
const signature = Buffer.from(request.headers["X-Lucid-Signature"], "base64");
const data = Buffer.from(body + nonce + params);
const verified = crypto.verify("SHA384", data, LUCID_PUBLIC_KEY, signature);
```
# Data update tokens
When a data connector recieves a data action request from Lucid, it will usually contain a data update token which can be used to send data back to Lucid documents. The data update token is scoped in one of two ways, depending on the type of data action that was invoked:

Document Specific - The data update token is scoped to a particular document and data source. In this case, the token can be used to add, change, or delete any data for the data source on the document. The data update token can also create a data source or new collections if they don't already exist on the document.
Data Source Specific - The data update token is scoped to existing data for a particular data source across multiple Lucid documents. In this case the data update token can be used to add data to or change data in existing collections on those documents. However, the token cannot be used to create new collections or new data sources on the document.


The following table shows which type of data update token each data action will recieve:

| Data Action Name              | Update Token Type       |
|-------------------------------|--------------------------|
| Import                        | Document Specific        |
| Hard Refresh                  | Document Specific        |
| Patch                         | None                     |
| Poll                          | Data Source Specific     |
| Custom Synchronous Action     | None                     |
| Custom Asynchronous Action    | Document Specific        |

