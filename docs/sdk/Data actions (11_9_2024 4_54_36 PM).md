 Data actions















Data actions are the backbone of a data connector. Data actions are invoked either explicitly by your editor extension, or in some cases automatically by Lucid’s server to help sync data changes. Data connectors declare which data actions they support, including things like importing data, refreshing data on open Lucid documents, and patching data changes made in Lucid back to an external data source.
Some actions are reserved, meaning that they are called outside of your extension when certain criteria are met. All other actions are custom, which means you are responsible for calling them somewhere within your extension. Here is a list of the current reserved actions:
ActionDescriptionHardRefreshCalled after a document is closed for an extended period of time to refresh data on the documentPollCalled every 30 seconds when a document is open to refresh data on the documentPatchCalled when users make changes to data on Lucid documents so those changes can be sent to the external data source
Registering data actions
Each action that your data connector supports needs to be declared within the data connector section of your manifest.json file:
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

You also have to append the actions to your data connector’s index.ts file:
/data-connector/index.tsimport {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';
import {myAction} from './actions/myaction';
import {anotherAction} from './actions/anotheraction';

export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
    .defineAsynchronousAction("MyAction", myAction)
    .defineAsynchronousAction("AnotherAction", anotherAction)

📘It is important that the name you assign to the action in your index file matches the name in your manifest file. This is especially important for reserved data actions which are invoked by Lucid’s server (such as the hard refresh and poll actions).
Calling data actions
After actions are created, you need to call them somewhere in your extension (unless they are called automatically by the SDK). This is done by using the performDataAction() method:
TypeScriptawait editorClient.performDataAction({
    actionName: "MyAction"
    actionData: <Data>
    // ...
});

Import action
An action you will likely want to create is an import action which pulls data from an external source, and posts that data to Lucid so it can be displayed on a Lucid document. How this is done will vary, but it might look something like this:
📘The import action is an example of a custom action, so you can name it whatever you want. For our example, we have named it “Import.”
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

/data-connector/index.tsimport {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';
import {importAction} from './actions/importaction';

export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
    .defineAsynchronousAction("Import", importAction)

/data-connector/actions/importaction.tsimport {DataConnectorAsynchronousAction} from 'lucid-extension-sdk';

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

Hard refresh action
Hard refresh is called when a document is opened after it has been closed for more than 5 minutes.
Your hard refresh action should fetch the data that has already been imported into Lucid by using action.context.documentCollections, and then update that data on Lucid documents by posting it back to Lucid.
Your code might look something like this:
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

/data-connector/index.tsimport {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';
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

📘You do not need to directly call the hard refresh action in your extension. Hard refresh is a reserved action and is invoked automatically by Lucid’s server at the appropriate times.
Poll action
The poll action refreshes all of the data on a Lucid document periodically. Polling achieves the same thing as the hard refresh action, but runs every 30 seconds while the Lucid documents are open. In most cases you can reuse the code you wrote for the hard refresh action, as both strategies update your data the same way. The poll action is distinct in that it can refresh data on multiple documents at once, whereas the hard refresh action only refreshes data on a single document. If you have implemented the Hard Refresh action, your code might look something like this:
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

/data-connector/index.tsimport {DataConnector, DataConnectorClient} from 'lucid-extension-sdk';
import {hardRefreshAction} from './actions/hardRefreshAction';

export const makeDataConnector = (client: DataConnectorClient) =>
    new DataConnector(client)
    .defineAsynchronousAction("Poll", hardRefreshAction)

📘You do not need to directly call the poll action in your extension. Poll is a reserved action and is invoked automatically by Lucid’s server at the appropriate times.