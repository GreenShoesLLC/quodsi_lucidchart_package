import { ComponentListManager } from "@quodsi/shared";
import { Connector } from "@quodsi/shared";


export class ConnectorListManager extends ComponentListManager<Connector> {
    getIncomingConnectors(activityId: string): Connector[] {
        return this.getAll().filter(connector => connector.targetId === activityId);
    }

    getOutgoingConnectors(activityId: string): Connector[] {
        return this.getAll().filter(connector => connector.sourceId === activityId);
    }
}