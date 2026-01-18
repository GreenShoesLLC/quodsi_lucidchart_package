Lucid provides a web based developer portal located here:

https://lucid.app/developer#/packages

As part of creating extension apps for LucidChart, you create Lucid Applications.

I currently have 2 Applications

Quodsi
QuodsiDev

I am working toward having 1 per environment;  Dev, Tst and Prd.

Lets treat the 'Quodsi' as the production environment.  My intent is to create 1 more application for TST.

Each application has an 'id' found after the URL base/packages/{id}

Here is the 'Quodsi' application URL

https://lucid.app/developer#/packages/d38c7ced-35e8-4962-a622-1d3fa480ab58

here is QuodsiDev

https://lucid.app/developer#/packages/8dc6bc70-c635-4263-a104-179c1412d979

Quodsi id is d38c7ced-35e8-4962-a622-1d3fa480ab58
QuodsiDev is 8dc6bc70-c635-4263-a104-179c1412d979

# manifest file
Each application environment has their own 'manifest.json' file located at the root of the source code package folder:

@quodsi_lucidchart_package\

manifest_local.json
manifest_dev.json
manifest_test.json
manifest_prod.json

manifest.json

Technically, only manifest.json is used during execution of Quodsi, either running locally or deployed.  The other manifest files are leveraged during the creation of the publish zip file based upon target deployment environment.

The following folder contains deployment script for publishing the Lucid zip file
C:\_source\Greenshoes\quodsi_lucidchart_package\deploy\README.md

Please notice during the deployment script, the script has a target environment and will move content from one of the manifest_*.json files to temporarily set in manifest.json.

Notice within each manifest*.json there is an id property such as:

"id": "d38c7ced-35e8-4962-a622-1d3fa480ab58"

The id is the lookup to the application id.

## Key manifest property differences

- id
- "dataConnectors": 
    "callbackBaseUrl": "http://localhost:7071/api/dataConnector/"

# lucid.credentials.local

Similar to the working manifest.json file, there is another root folder file lucid.credentials.local

@quodsi_lucidchart_package\lucid.credentials.local

{
    "clientId": "12345",
    "clientSecret": "12345"
}

Within the Lucid Developer portal, in the homepage for a specific Application, there is an OAuth 2.0 section.

By default, in a new Application, the OAuth 2.0 section is empty.  Do I need one?


 which also includes 'QuodsiApiClient'