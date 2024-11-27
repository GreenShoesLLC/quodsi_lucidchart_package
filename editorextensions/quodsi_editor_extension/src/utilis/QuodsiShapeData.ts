import { ElementProxy } from "lucid-extension-sdk";
import { Activity } from "../shared/types/elements/activity";
import { Connector } from "../shared/types/elements/connector";
import { Entity } from "../shared/types/elements/entity";
import { SimulationObjectType } from "../shared/types/elements/enums/simulationObjectType";
import { Model } from "../shared/types/elements/model";
import { Resource } from "../shared/types/elements/resource";
import { Generator } from "../shared/types/elements/generator";
import { SimulationObject } from "../shared/types/elements/simulation_object";
import { SimComponentType } from "../shared/types/simComponentTypes";


export class QuodsiShapeData {
    private static readonly OBJECT_TYPE_KEY = 'q_objecttype';
    private static readonly DATA_KEY = 'q_data';

    constructor(
        private element: ElementProxy, // PageProxy, BlockProxy, LineProxy, etc.
    ) { }

    setComponentType(type: SimComponentType): void {
        console.log('[QuodsiShapeData] Setting component type:', {
            shapeId: this.element.id,
            type,
            timestamp: new Date().toISOString()
        });

        this.element.shapeData.set('q_objecttype', type);
    }

    setComponentData(data: any): void {
        console.log('[QuodsiShapeData] Setting component data:', {
            shapeId: this.element.id,
            dataSize: JSON.stringify(data).length,
            timestamp: new Date().toISOString()
        });

        this.element.shapeData.set('q_data', JSON.stringify(data));
    }

    updateComponent(type: SimComponentType, data: any): void {
        const previousType = this.getComponentType();

        console.log('[QuodsiShapeData] Updating component:', {
            shapeId: this.element.id,
            previousType,
            newType: type,
            timestamp: new Date().toISOString()
        });

        this.setComponentType(type);
        this.setComponentData(data);
    }

    getComponentType(): SimComponentType | undefined {
        const type = this.element.shapeData.get('q_objecttype');
        return type as SimComponentType;
    }

    getComponentData<T>(): T | null {
        const rawData = this.element.shapeData.get('q_data');
        try {
            // Ensure we're parsing a string
            const dataString = typeof rawData === 'string' ? rawData : String(rawData);
            return dataString ? JSON.parse(dataString) : null;
        } catch (error) {
            console.error('[QuodsiShapeData] Error parsing component data:', {
                shapeId: this.element.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                rawDataType: typeof rawData,
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    // Helper method to check if data exists
    hasComponentData(): boolean {
        const data = this.element.shapeData.get('q_data');
        return data !== undefined && data !== null;
    }

    // Helper method to validate component type
    isValidComponentType(): boolean {
        const type = this.getComponentType();
        return type !== undefined && Object.values(SimComponentType).includes(type);
    }
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
