import { ScenarioObjectType } from '@quodsi/shared';
import { NumericPropertyModification } from '@quodsi/shared';
import { BooleanPropertyModification } from '@quodsi/shared';
import { DurationModification } from "./DurationModification";
import { ResourceRequirementModification } from "./ResourceRequirementModification";
import { ScenarioPropertyName, PROPERTY_DISPLAY_LABELS } from "./ScenarioPropertyName";
import { generateUUID } from "../../utils/uuidUtils";

export type ModificationType = NumericPropertyModification | BooleanPropertyModification | DurationModification | ResourceRequirementModification;
/** Alias for ModificationType (plan A.4.1 name). */
export type ModificationDetails = ModificationType;

export interface ObjectMatchCriteria {
    name?: string;
    nameContains?: string;
    nameStartsWith?: string;
    nameEndsWith?: string;
}

export class ScenarioChangeRequest {
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
    }) {
        this.id = options.id ?? generateUUID();
        this.objectType = options.objectType;
        this.objectMatchCriteria = options.objectMatchCriteria;
        this.modificationDetails = options.modificationDetails;
        this.description = options.description;
        this.actionId = options.actionId;
    }

    toJSON(): any {
        return {
            id: this.id,
            objectType: this.objectType,
            objectMatchCriteria: this.objectMatchCriteria,
            modificationDetails: this.modificationDetails.toJSON(),
            description: this.description,
            ...(this.actionId !== undefined ? { actionId: this.actionId } : {}),
        };
    }

    static fromJSON(data: any): ScenarioChangeRequest {
        const modData = data.modificationDetails;
        let modification: ModificationType;
        if (modData.type === "boolean") {
            modification = BooleanPropertyModification.fromJSON(modData);
        } else if (modData.type === "duration") {
            modification = DurationModification.fromJSON(modData);
        } else if (modData.type === "reference") {
            modification = ResourceRequirementModification.fromJSON(modData);
        } else {
            modification = NumericPropertyModification.fromJSON(modData);
        }

        return new ScenarioChangeRequest({
            id: data.id,
            objectType: data.objectType as ScenarioObjectType,
            objectMatchCriteria: data.objectMatchCriteria,
            modificationDetails: modification,
            description: data.description,
            actionId: data.actionId,
        });
    }
}

/**
 * Generate the one-line summary shown in collapsed change-request rows.
 * Example: "ACTIVITY Workstation1: Activity Capacity Set to 5"
 */
export function summarizeChangeRequest(cr: ScenarioChangeRequest): string {
    const target = cr.objectMatchCriteria.name ?? '<unnamed>'
    const mod = cr.modificationDetails
    const propLabel = PROPERTY_DISPLAY_LABELS[mod.propertyName] ?? mod.propertyName
    const targetText = cr.objectType === ScenarioObjectType.MODEL
        ? `${cr.objectType}`
        : `${cr.objectType} ${target}`
    if (mod instanceof NumericPropertyModification) {
        return `${targetText}: ${propLabel} ${mod.setterType} ${mod.newValue}`
    }
    if (mod instanceof DurationModification) {
        const isArrival = mod.propertyName === ScenarioPropertyName.INTERARRIVAL_TIMING
        if (mod.mode === 'scaleRate') {
            const noun = isArrival ? 'Arrival rate' : 'Duration'
            return `${targetText}: ${noun} ×${mod.factor}`
        }
        const dtype = mod.duration?.distribution.distributionType
        const name = dtype ?? '—'
        const what = isArrival ? 'arrival distribution' : 'duration'
        return `${targetText}: ${what} → ${name}`
    }
    if (mod instanceof ResourceRequirementModification) {
        return `${targetText}: ${propLabel} → ${mod.resourceRequirementId}`
    }
    // Boolean (unused by MVP UI but supported by serialization)
    return `${targetText}: ${propLabel} = ${(mod as BooleanPropertyModification).newValue}`
}
