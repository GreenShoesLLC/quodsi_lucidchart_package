user registers a new Quodsi account.
new user added to Quodsi relational database within a default tenant.



user logs into Quodsi account in lucidchart
user session created

user opens an existing or creates a new diagram.
user "initializes" a Quodsi model.
A new dbo.Model is created in the Quodsi db. 
source = lucidchart, 

user "Removes" a model.
Deletes model from database.


User hits "Simulate" button.
Checks if an dbo.Analysis has been created.  if not, creates one.
Checks if a scenario exists with the same name or id.  It not, creates scenario withina analysis, within model.
published model.json to blob storage.  scenario.blob_storage_path
scenario batch job triggered which needs to update the dbo.scenario.state value and potentially other fields.

Quodsi Lucid react app polls the scenarios of the associated dbo.model for state changes.

A user can sign into quodsi app and see the same Model.



