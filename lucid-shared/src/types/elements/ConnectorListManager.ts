import { ComponentListManager } from "./ComponentListManager";
import { Connector } from "./Connector";
import { SimulationObjectType } from "./SimulationObjectType";

export class ConnectorListManager extends ComponentListManager<Connector> {
    constructor() {
        super(SimulationObjectType.Connector);
    }
}