 Building a data connector















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

Declare your data connector
To declare a data connector, include an array of dataConnectors in your manifest.json. Each data connector must contain the following:
FieldDescriptionExamplenameThen name you will use to refer to this data connector in your extensionDemoDataConnectoroauthProviderNameThe name of an OAuth provider defined in your mainfest.jsonasanacallbackBaseUrlThe base url Lucid will send callback events tohttps://www.example.com/dataActionsA mapping of the data actions supported by this data connector to the url suffix that should be appended to the callbackBaseUrl when making requests for that type of data action.{"Import" : "import"}
Any time you add or update declarations for any data connectors, you will need to package and upload your manifest, then install the extension for yourself again before your data connector can be used by your extension.
Implement your data connector
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
TypeScriptnew DataConnector(new DataConnectorClient(cryptoDependencies)).defineAsynchronousAction('Import', async (action) => {
    const client = action.client; // <- an authorized client for sending data back to the document
    const actionName = action.name; // <- "Import"
    const actionData = action.data; // <- {'requestedItems': ['id-1', 'id-2']}
    const userCredential = action.context.userCredential; // <- the OAuth access token for the user who triggered the data action
});

To add a new collection to the document containing the requested items, you must first define what the data will look like using a schema. For this example, you will use data of the following type:
TypeScripttype MyItemType = {id: string; name: string; age: number; isSingle: boolean};

You can define the schema for your data by calling declareSchema and specifying the types for each of the fields in your data:
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

To fulfill the import request, retrieve the data that was requested, then use the authorized client provided to post the data back to the document:
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

Field labels
When fields are displayed in the card details panels, or in other visualizations, the field name will be used as the label for the field. You can specify the labels that will be used by providing a custom label as part of the schema while adding a collection. This is done by adding a collection to a data source that has been imported. Include the fields from the source you want to display, specify which field is the primary key, then add field labels for any field names you want to override:
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

Lucid Fields
Lucid defines a set of fields to provide consistent meaning across data sources when those data sources use different names for the same concepts.
For example, Jira calls the status field on their tasks "state", while Azure DevOps calls the status field on their tasks "status".
Conceptually, both fields mean the same thing and should be treated consistently by Lucid, even though their names differ in their respective data sources.
By applying a Lucid Field mapping to these fields, Lucid will recognize and treat those fields consistently, whether the task came from Jira or Azure DevOps.
Additionally, if you would like your data to work in some of Lucid's powerful visualizations like the timeline, you must assign Lucid fields to your data when specifying the schema.
For example:
TypeScriptsource.addCollection('track-tickets', {
    fields: [
        {name: 'id', type: ScalarFieldTypeEnum.STRING},
        {name: 'description', type: ScalarFieldTypeEnum.STRING, mapping: [LucidFields.Description]},
        {name: 'assigned', type: [ScalarFieldTypeEnum.STRING, ScalarFieldTypeEnum.NULL], mapping: [LucidFields.User]},
        {name: 'state', type: [ScalarFieldTypeEnum.STRING, ScalarFieldTypeEnum.NULL], mapping: [LucidFields.Status]},
    ],
    primaryKey: ['id'],
});

The current Lucid Fields are:
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

Expose a URL for your data connector
The final step is to use your data connector to handle incoming requests by calling dataConnector.runAction:
TypeScriptconst response = await dataConnector.runAction(requestUrl, requestHeaders, requestBodyAsJson);

As an example, this code sets up a simple development server using node express that will accept and respond to requests made to your data connector:
serve.jsimport {DataConnectorClient} from 'lucid-extension-sdk';
import {makeDataConnector} from './dataconnector';
import * as express from 'express';
import * as crypto from 'crypto';

const client = new DataConnectorClient({Buffer, crypto});
const dataConnector = makeDataConnector(client);
dataConnector.runDebugServer({express});

inline:shnode ./serve.js

You will need to expose the URL you are using to accept requests publicly so that Lucid's servers can send it requests.
Examples
For a more thorough example, you can look at the source code for Lucid's Asana Cards extension here.
You can find the extension here if you want to try it out.