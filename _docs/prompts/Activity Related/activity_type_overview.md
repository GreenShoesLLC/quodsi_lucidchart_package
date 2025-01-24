
I am looking for support in building a user interface for an instance of an Activity

An activity is an complex object composed of the following:


export enum SimulationObjectType {
  Entity = "Entity",
  Activity = "Activity",
  Connector = "Connector",
  Generator = "Generator",
  Resource = "Resource",
  ResourceRequirement = "ResourceRequirement",
  Scenario = "Scenario",
  Experiment = "Experiment",
  Model = "Model",
  None = "None"
}

export interface SimulationObject {
  id: string;
  name: string;
  type: SimulationObjectType;
}

export class Activity implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Activity;
    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1,
        public inputBufferCapacity: number = 1,
        public outputBufferCapacity: number = 1,
        public operationSteps: OperationStep[] = [],
    ) { }
}

export enum DurationType {
    CONSTANT = "CONSTANT",
    DISTRIBUTION = "DISTRIBUTION"
}
export enum PeriodUnit {
    SECONDS = "SECONDS",
    MINUTES = "MINUTES",
    HOURS = "HOURS",
    DAYS = "DAYS"
}

export class Duration {
    constructor(
        public durationLength: number = 0.0,
        public durationPeriodUnit: PeriodUnit = PeriodUnit.MINUTES,
        public durationType: DurationType = DurationType.CONSTANT,
        public distribution: Distribution | null = null
    ) { }
}
export interface OperationStep {
    requirementId: string | null;
    quantity: number;
    duration: Duration;
}
export enum RequirementMode {
    REQUIRE_ALL = "REQUIRE_ALL",
    REQUIRE_ANY = "REQUIRE_ANY",
}
export class Resource implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Resource;
    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1
    ) { }
}
export class ResourceRequest {
    resourceId: string;
    quantity: number;
    priority: number;
    keepResource: boolean;

export class ResourceRequirement implements SimulationObject {
    id: string;
    name: string;
    type: SimulationObjectType = SimulationObjectType.ResourceRequirement;
    rootClauses: RequirementClause[];

Here are 3 different instances of an Activity of various complexity.
C:\_source\Greenshoes\quodsi_lucidchart_package\docs\prompts\Activity Related\activity_instances_example.md

Here are some paths of the current definition of Activity related types:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\OperationStep.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\Duration.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\PeriodUnit.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\RequirementClause.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\Resource.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ResourceRequest.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\ResourceRequirement.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\RequirementMode.ts