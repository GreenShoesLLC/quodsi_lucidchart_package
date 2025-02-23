


## ModelDefinition
The full code for ModelDefinition can be found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ModelDefinition.ts

ModelDefinition is essentially a class that manages lists of other simulaton related classes.  The following folder contains all the types and classes managed by ModelDefinition:

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements

Here are some of the key types and their code files:

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ActivityListManager.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\Activity.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ConnectorListManager.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\Connector.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ResourceListManager.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\Resource.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\GeneratorListManager.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\Generator.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\EntityListManager.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\Entity.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ResourceRequirementListManager.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ResourceRequirement.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\RequirementClause.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ResourceRequest.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\RequirementMode.ts



### Creating a Model Definition

LucidChart diagrams contain Shapes, Blocks and Lines generically refered to as Elements.  Elements can stored custom data.  Quodsi stores custom data inside of the element's custom shape data capability.

The ModelDefinitionPageBuilder can create a new instance of a ModelDefinition within its buildFromConvertedPage method.  Please see the full code file here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\core\ModelDefinitionPageBuilder.ts

### ModelDefinitionPageBuilder depends on LucidElementFactory
ModelDefinitionPageBuilder depends on LucidElementFactory.  LucidElementFactory is a platform specific class dedicated to create the Lucid specific version of the generic Entity, Activity, etc.  Please find the full code here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\services\LucidElementFactory.ts

For more information, refer to the README.md located inside of this directory

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\types\

here is another great README.md

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\platform\README.md

### Serialization



### Validation
please review ModelValidationService

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\validation\services\ModelValidationService.ts

ModelValidationService validates an instance of a ModelDefinition

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ModelDefinition.ts



ModelValidationService contains a list of rules where each rule is focused on validating one of the main simulation types.  please see the rule files in this folder:

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\validation\rules

Please study those files and help me evaluate making some changes to ModelValidationService



# ModelManager
The full code for ModelManager can be found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\core\ModelManager.ts

ModelManager contains the property modelDefinition: ModelDefinition

private modelDefinition: ModelDefinition | null = null;
