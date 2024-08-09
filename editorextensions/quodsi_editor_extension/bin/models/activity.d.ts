import { SimulationObjectType } from "./enums";
import { DistributionType } from "./enums/DistributionType";
import { DurationType } from "./enums/DurationType";
import { PeriodUnit } from "./enums/PeriodUnit";
import { RequestSetType } from "./enums/RequestSetType";
import { DistributionParameters } from "./interfaces";
import { Resource } from "./resource";
export declare class Activity implements Activity {
    id: string;
    name: string;
    capacity: number;
    inputBufferCapacity: number;
    outputBufferCapacity: number;
    operationSteps: OperationStep[];
    type: SimulationObjectType.Activity;
    constructor(id: string, name: string, capacity?: number, inputBufferCapacity?: number, outputBufferCapacity?: number, operationSteps?: OperationStep[]);
}
export declare class OperationStep implements OperationStep {
    resourceSetRequest: ResourceSetRequest | null;
    duration: Duration;
    constructor(resourceSetRequest?: ResourceSetRequest | null, duration?: Duration);
}
export declare class Duration implements Duration {
    durationLength: number;
    durationPeriodUnit: PeriodUnit;
    durationType: DurationType;
    distribution: Distribution | null;
    constructor(durationLength?: number, durationPeriodUnit?: PeriodUnit, durationType?: DurationType, distribution?: Distribution | null);
}
export declare class Distribution implements Distribution {
    distributionType: DistributionType;
    parameters: DistributionParameters;
    description: string;
    constructor(distributionType: DistributionType, parameters: DistributionParameters, description?: string);
}
export declare class ResourceSetRequest implements ResourceSetRequest {
    name: string;
    requestType: RequestSetType;
    requests: Array<ResourceRequest | ResourceSetRequest>;
    constructor(name?: string, requestType?: RequestSetType, requests?: Array<ResourceRequest | ResourceSetRequest>);
}
export declare class ResourceRequest implements ResourceRequest {
    keepResource: boolean;
    resource: Resource | null;
    quantity: number;
    constructor(keepResource?: boolean, resource?: Resource | null, quantity?: number);
}
