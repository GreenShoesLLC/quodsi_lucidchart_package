import { ComponentListManager } from "./ComponentListManager";
import { TimeDistributedConfig } from "./TimeDistributedConfig";
import { SimulationObjectType } from "./SimulationObjectType";

/**
 * List manager for TimeDistributedConfig collections.
 *
 * Manages the collection of time distributed configurations that combine
 * temporal patterns with volumes and date ranges.
 */
export class TimeDistributedConfigListManager extends ComponentListManager<TimeDistributedConfig> {
    constructor() {
        super(SimulationObjectType.None);
    }
}
