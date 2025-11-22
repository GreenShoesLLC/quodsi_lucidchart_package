import { ComponentListManager } from "./ComponentListManager";
import { TimePattern } from "./TimePattern";
import { SimulationObjectType } from "./SimulationObjectType";

/**
 * List manager for TimePattern collections.
 *
 * Manages the collection of reusable temporal distribution patterns
 * used by TIME_DISTRIBUTED generators.
 */
export class TimePatternListManager extends ComponentListManager<TimePattern> {
    constructor() {
        super(SimulationObjectType.None);
    }
}
