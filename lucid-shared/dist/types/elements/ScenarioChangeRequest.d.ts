import { ScenarioObjectType } from "./ScenarioObjectType";
import { NumericPropertyModification } from "./NumericPropertyModification";
import { BooleanPropertyModification } from "./BooleanPropertyModification";
import { DurationModification } from "./DurationModification";
import { ResourceRequirementModification } from "./ResourceRequirementModification";
export type ModificationType = NumericPropertyModification | BooleanPropertyModification | DurationModification | ResourceRequirementModification;
/** Alias for ModificationType (plan A.4.1 name). */
export type ModificationDetails = ModificationType;
export interface ObjectMatchCriteria {
    name?: string;
    nameContains?: string;
    nameStartsWith?: string;
    nameEndsWith?: string;
}
export declare class ScenarioChangeRequest {
    id: string;
    objectType: ScenarioObjectType;
    objectMatchCriteria: ObjectMatchCriteria;
    modificationDetails: ModificationType;
    description?: string;
    actionId?: string;
    constructor(options: {
        id?: string;
        objectType: ScenarioObjectType;
        objectMatchCriteria: ObjectMatchCriteria;
        modificationDetails: ModificationType;
        description?: string;
        actionId?: string;
    });
    toJSON(): any;
    static fromJSON(data: any): ScenarioChangeRequest;
}
/**
 * Generate the one-line summary shown in collapsed change-request rows.
 * Example: "ACTIVITY Workstation1: Activity Capacity Set to 5"
 */
export declare function summarizeChangeRequest(cr: ScenarioChangeRequest): string;
//# sourceMappingURL=ScenarioChangeRequest.d.ts.map