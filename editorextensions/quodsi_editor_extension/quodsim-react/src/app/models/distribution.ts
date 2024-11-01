import { DistributionType } from "./enums/DistributionType";
import { DistributionParameters } from "./interfaces";

export class Distribution {
    constructor(
        public distributionType: DistributionType,
        public parameters: DistributionParameters,
        public description: string = ""
    ) { }
}