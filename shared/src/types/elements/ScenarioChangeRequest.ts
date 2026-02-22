import { ScenarioObjectType } from "./ScenarioObjectType";
import { NumericPropertyModification } from "./NumericPropertyModification";
import { BooleanPropertyModification } from "./BooleanPropertyModification";
import { generateUUID } from "../../utils/uuidUtils";

export type ModificationType = NumericPropertyModification | BooleanPropertyModification;

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

    constructor(options: {
        id?: string;
        objectType: ScenarioObjectType;
        objectMatchCriteria: ObjectMatchCriteria;
        modificationDetails: ModificationType;
        description?: string;
    }) {
        this.id = options.id ?? generateUUID();
        this.objectType = options.objectType;
        this.objectMatchCriteria = options.objectMatchCriteria;
        this.modificationDetails = options.modificationDetails;
        this.description = options.description;
    }

    toJSON(): any {
        return {
            id: this.id,
            objectType: this.objectType,
            objectMatchCriteria: this.objectMatchCriteria,
            modificationDetails: this.modificationDetails.toJSON(),
            description: this.description,
        };
    }

    static fromJSON(data: any): ScenarioChangeRequest {
        const modData = data.modificationDetails;
        const modification = modData.type === "boolean"
            ? BooleanPropertyModification.fromJSON(modData)
            : NumericPropertyModification.fromJSON(modData);

        return new ScenarioChangeRequest({
            id: data.id,
            objectType: data.objectType as ScenarioObjectType,
            objectMatchCriteria: data.objectMatchCriteria,
            modificationDetails: modification,
            description: data.description,
        });
    }
}
