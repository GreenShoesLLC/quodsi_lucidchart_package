The Quodsi React app contains components such as:

ActivityEditor.tsx
EntityEditor.tsx
ConnectorEditor.tsx
GeneratorEditor.tsx
ResourceEditor.tsx

I will refer to the react as QuodsiReact.

The App Component in App.tsx determines which one of these *Editors to render based upon receiving a LucidChartMessage found in LucidChartMessage.ts.

export interface LucidChartMessage {
    [key: string]: any;  // index signature
    messagetype: string;
    simtype?: string;
    version: string;
    instancedata: string;
    documentId: string;
    lucidId: string;
}


The editor to render is primarily driven from the LucidChartMessage.simtype

The QuodsiReact surfaces its HTML pages onto Iframes provided by the Quodsi Lucidchart package extension which i will refer to as QuodsiLucid.  When a user clicks on a LucidChart shape, the selectionChangedCallback method of extension.ts of QuodsiLucid is called.  selectionChangedCallback inspects the select LucidChart shape for custom data properties potentially added to the shape by QuodsiLucid code and then sends a LucidChartMessage to QuodsiReact.

If the user selects a Lucidchart shape which contains q_objecttype value of "activity", then a LucidChartMessage is created where simtype is set to "activity" and then QuodsiReact receives the message and sets the editor to ActivityEditor.

in QuodsiReact, I would like to create a new React component SimulationComponentSelector that allows a user to change the selected Lucidchart shape to a predefined list of available simtype values.  Similar to how App component renders both StatusMonitor and the proper Editor for the LucidChartMessage.simtype, the vision would be the SimulationComponentSelector is always rendered above the editor.

In QuodsiLucid, I would like to add the necessary code that either sets and/or swaps out q_objecttype and q_data data key values in ElementProxy.


# SimComponentNames
I need to define a predefined list of available simtype values.  I will refer to this list as SimComponentNames.  Known SimComponentNames values right now are activity, generator, connector, model, entity and resource.  SimComponentNames list will need to be defined in both QuodsiLucid and QuodsiReact.


# QuodsiReact SimulationComponentSelector


The SimulationComponentSelector will show a combo box or similar control that allows the user to select a value from the SimComponentNames list.

The SimulationComponentSelector will need to manage what the selectedSimComponent is.


If SimulationComponentSelector is initialized with a valid selectedSimComponent, then the drop down is initially set to that value.

If SimulationComponentSelector is initialized without a selectedSimComponent, then the drop down is initially set to something like "Please Select" or similar.  Please suggest an approach for initial selection when the currently selected shape has not been converted to a simulation component yet.

The assumption is that the SimulationComponentSelector is rendered on a page that also contains an editor.  Once the user makes a selection, App component needs to react to the change and set the proper editor.  The user can now update the properties of the chosen editor.  Eventually, the user will hit "Save" button.  Each editor type has a handleSave method that will postMessage back to QuodsiLucid which will be received by messageFromFrame in right-panel.ts.  For example, when ActivtyEditor save button is clicked, postMessage is sent with messagetype of "activitySaved".

# Updating right-panel.ts messageFromFrame
Each editor type has a handleSave method that will postMessage back to QuodsiLucid which will be received by messageFromFrame in right-panel.ts.  For example, when ActivtyEditor save button is clicked, postMessage is sent with messagetype of "activitySaved".

In the current code for saving each SimComponentName, only the q_data is being set:

selectedItem.shapeData.set('q_data', serializedData);

We need to make sure that q_objecttype is also properly set.

QuodsiLucid has a file QuodsiShapeData.ts that contains QuodsiShapeData class with methods related to managing custom data properties on Lucid shapes and lines.  Instead of each messageType directly setting the shape properties, I feel a better design might be to add code in QuodsiShapeData that messageFromFrame can defer to.

