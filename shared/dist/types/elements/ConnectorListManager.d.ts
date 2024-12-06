import { ComponentListManager } from "./ComponentListManager";
import { Connector } from "./Connector";
export declare class ConnectorListManager extends ComponentListManager<Connector> {
    getIncomingConnectors(activityId: string): Connector[];
    getOutgoingConnectors(activityId: string): Connector[];
}
