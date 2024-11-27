import { BaseSimulationElement } from '../shared/types/ModelTypes';
import { ValidationResult } from '../shared/types/ValidationTypes';
export interface ConnectorData {
    id: string;
    name: string;
    sourceId: string;
    targetId: string;
    probability: number;
    routing: {
        type: string;
        conditions: any[];
    };
}
export declare class Connector extends BaseSimulationElement {
    name: string;
    sourceId: string;
    targetId: string;
    probability: number;
    routing: {
        type: string;
        conditions: any[];
    };
    constructor(data: ConnectorData);
    validate(): ValidationResult;
    toStorage(): object;
    fromStorage(data: any): Connector;
}
