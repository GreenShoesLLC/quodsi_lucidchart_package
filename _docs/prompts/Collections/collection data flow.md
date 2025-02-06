When the user hits simulate button with context of Modelid, scenarioid
Modelid = pageid or documentId concatenated with pageid
scenarioId = empty guid for now.

Check if there is a model in the models collection with that pageId. If not, a new model data item added to model collection.  
Model has: id, name, reps, etc
Check if a scenario exists. If not, add a new scenario data item is added to the document’s scenarios collection.  
A scenario has an id, modelid, name, reps, etc.
In the current code, the C# code will query the contents of the document, read shape data and create the model definition json file.
In the future, we might need to query the dataproxy and build the model that way.
TODO: in the click handler for simulate,

Azure batch job is created which results in a blob container with the scenario UUID

https://developer.lucid.co/reference/dataproxy-sdk
https://developer.lucid.co/reference/collectionproxy-sdk
https://developer.lucid.co/reference/dataitemproxy-sdk
