import { SimulationObjectType } from "./enums";
import { DistributionType } from "./enums/DistributionType";
import { DurationType } from "./enums/DurationType";
import { PeriodUnit } from "./enums/PeriodUnit";
import { RequestSetType } from "./enums/RequestSetType";
import { DistributionParameters } from "./interfaces";
import { Resource } from "./resource";


export class Activity implements Activity {
    type: SimulationObjectType.Activity = SimulationObjectType.Activity;

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1,
        public inputBufferCapacity: number = Infinity,
        public outputBufferCapacity: number = Infinity,
        public operationSteps: OperationStep[] = []
    ) { }
}

export class OperationStep implements OperationStep {
    constructor(
        public resourceSetRequest: ResourceSetRequest | null = null,
        public duration: Duration = new Duration()
    ) { }
}

export class Duration implements Duration {
    constructor(
        public durationLength: number = 0.0,
        public durationPeriodUnit: PeriodUnit = PeriodUnit.MINUTES,
        public durationType: DurationType = DurationType.CONSTANT,
        public distribution: Distribution | null = null
    ) { }
}

export class Distribution implements Distribution {
    constructor(
        public distributionType: DistributionType,
        public parameters: DistributionParameters,
        public description: string = ""
    ) { }
}

export class ResourceSetRequest implements ResourceSetRequest {
    constructor(
        public name: string = 'initial',
        public requestType: RequestSetType = RequestSetType.AND,
        public requests: Array<ResourceRequest | ResourceSetRequest> = []
    ) { }
}

export class ResourceRequest implements ResourceRequest {
    constructor(
        public keepResource: boolean = false,
        public resource: Resource | null = null,
        public quantity: number = 1
    ) { }
}
