import { SimulationObjectType } from "./SimulationObjectType";
import { OperationStep } from "./OperationStep";
import { SimulationObject } from "./SimulationObject";
import { Connector } from "./Connector";

export class Activity implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Activity;

    static createDefault(id: string): Activity {
        return new Activity(
            id,
            'New Activity',
            1, // capacity
            Infinity, // inputBufferCapacity
            Infinity, // outputBufferCapacity
            [], // operationSteps
            [] // connectors
        );
    }

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1,
        public inputBufferCapacity: number = Infinity,
        public outputBufferCapacity: number = Infinity,
        public operationSteps: OperationStep[] = [],
        public connectors: Connector[] = []
    ) { }
}