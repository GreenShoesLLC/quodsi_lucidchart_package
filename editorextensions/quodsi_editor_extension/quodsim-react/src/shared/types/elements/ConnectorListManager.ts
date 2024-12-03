import { ComponentListManager } from "./ComponentListManager";
import { Connector } from "./Connector";


export class ConnectorListManager extends ComponentListManager<Connector> {
    getIncomingConnectors(activityId: string): Connector[] {
        return this.getAll().filter(connector => connector.targetId === activityId);
    }

    getOutgoingConnectors(activityId: string): Connector[] {
        return this.getAll().filter(connector => connector.sourceId === activityId);
    }
}





