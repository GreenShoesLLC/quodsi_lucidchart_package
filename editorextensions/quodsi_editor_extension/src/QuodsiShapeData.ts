import { ElementProxy } from "lucid-extension-sdk";
import { Activity } from "./models/activity";
import { Connector } from "./models/connector";
import { Entity } from "./models/entity";
import { SimulationObjectType } from "./models/enums/simulationObjectType";
import { Model } from "./models/model";
import { Resource } from "./models/resource";
import { Generator } from "./models/generator";
import { SimulationObject } from "./models/simulation_object";

export class QuodsiShapeData {
    private static readonly OBJECT_TYPE_KEY = 'q_objecttype';
    private static readonly DATA_KEY = 'q_data';

    constructor(
        private element: ElementProxy, // PageProxy, BlockProxy, LineProxy, etc.
    ) { }

    setObjectTypeAndData<T extends SimulationObject>(objectType: SimulationObjectType, data: T): void {
        this.element.shapeData.set(QuodsiShapeData.OBJECT_TYPE_KEY, objectType.toLowerCase());
        this.element.shapeData.set(QuodsiShapeData.DATA_KEY, JSON.stringify(data));
    }

    deleteObjectTypeAndData(): boolean {
        try {
            let deleted = false;

            // Check if 'q_objecttype' exists before attempting to delete
            if (this.element.shapeData.get(QuodsiShapeData.OBJECT_TYPE_KEY)) {
                this.element.shapeData.delete(QuodsiShapeData.OBJECT_TYPE_KEY);
                console.log('Extension: successfully deleted q_objecttype');
                deleted = true;
            } else {
                console.log('Extension: q_objecttype not found on the element');
            }

            // Check if 'q_data' exists before attempting to delete
            if (this.element.shapeData.get(QuodsiShapeData.DATA_KEY)) {
                this.element.shapeData.delete(QuodsiShapeData.DATA_KEY);
                console.log('Extension: successfully deleted q_data');
                deleted = true;
            } else {
                console.log('Extension: q_data not found on the element');
            }

            return deleted;
        } catch (error) {
            console.error('Extension: Error deleting q_objecttype or q_data', error);
            return false;
        }
    }

    getObjectType(): SimulationObjectType | null {
        return this.element.shapeData.get(QuodsiShapeData.OBJECT_TYPE_KEY) as SimulationObjectType | null;
    }

    getData<T extends SimulationObject>(): T | null {
        const data = this.element.shapeData.get(QuodsiShapeData.DATA_KEY);

        if (typeof data === 'string') {
            return JSON.parse(data) as T;
        }

        return null;
    }

    getTypedData(): SimulationObject | null {
        const objectType = this.getObjectType();
        const dataValue = this.element.shapeData.get(QuodsiShapeData.DATA_KEY);

        if (!objectType || typeof dataValue !== 'string') {
            return null;
        }

        const parsedData = JSON.parse(dataValue);

        switch (objectType) {
            case SimulationObjectType.Model:
                return parsedData as Model;
            case SimulationObjectType.Activity:
                return parsedData as Activity;
            case SimulationObjectType.Connector:
                return parsedData as Connector;
            case SimulationObjectType.Resource:
                return parsedData as Resource;
            case SimulationObjectType.Entity:
                return parsedData as Entity;
            case SimulationObjectType.Generator:
                return parsedData as Generator;
            // Add cases for other SimulationObjectTypes as needed
            default:
                return null;
        }
    }


    static isValidData(objectType: SimulationObjectType, data: any): boolean {
        if (!data || typeof data !== 'object') {
            return false;
        }

        return data.type === objectType;
    }
}
