import { DistributionType } from "./enums/DistributionType";
import { DistributionParameters } from "./interfaces";
export declare class Distribution {
    distributionType: DistributionType;
    parameters: DistributionParameters;
    description: string;
    constructor(distributionType: DistributionType, parameters: DistributionParameters, description?: string);
}
