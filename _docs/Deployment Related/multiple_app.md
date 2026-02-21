Lucid provides a web based developer portal located here:

https://lucid.app/developer#/packages

As part of creating extension apps for LucidChart, you create Lucid Applications.

I currently have 2 Applications

Quodsi
QuodsiDev

I am working toward having 1 per environment;  Dev, Tst and Prd.

Lets treat 'Quodsi' as the production environment.  My intent is to create 1 more application for TST once I confirm I can get these 2 working.

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
C:\_source\quodsi\quodsi_lucidchart_package\deploy\README.md

Please notice during the deployment script, the script has a target environment and will move content from one of the manifest_*.json files to temporarily set in manifest.json.

Notice within each manifest*.json there is an id property such as:

"id": "d38c7ced-35e8-4962-a622-1d3fa480ab58"

The id is the lookup to the application id.

## Key manifest property differences

- id
- "dataConnectors": 
    "callbackBaseUrl": "http://localhost:7071/api/dataConnector/"

# Task REquest

Notice that manifest_dev.json has an updated id already.  

I want to modify the deployment scripts to make sure, as part of making the zip, when the target environment is dev, that it temporarily copies the manifest_dev.json to manifest.json which results in the id changing.  it is possible this is already occurring.