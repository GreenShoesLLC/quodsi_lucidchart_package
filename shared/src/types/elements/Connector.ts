import { SimulationObjectType } from "./SimulationObjectType";
import { ConnectType } from "./ConnectType";
import { OperationStep } from "./OperationStep";
import { SimulationObject } from "./SimulationObject";

export class Connector implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Connector;

    static createDefault(id: string): Connector {
        return new Connector(
            id,
            'New Connector',
            '', // sourceId
            '', // targetId
            1.0, // probability
            ConnectType.Probability, // connectType
            [] // operationSteps
        );
    }

    constructor(
        public id: string,
        public name: string,
        public sourceId: string,
        public targetId: string,
        public probability: number = 1.0,
        public connectType: ConnectType = ConnectType.Probability,
        public operationSteps: OperationStep[] = []
    ) { }
}