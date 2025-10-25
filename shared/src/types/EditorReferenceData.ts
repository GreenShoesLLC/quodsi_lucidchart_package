import { ResourceRequirement } from "./elements/ResourceRequirement";
import { Connector } from "./elements/Connector";
import { ConnectType } from "./elements/ConnectType";

export interface EditorReferenceData {
    entities?: Array<{ id: string, name: string }>;
    resources?: Array<{ id: string, name: string }>;
    activities?: Array<{ id: string, name: string, connectType?: ConnectType }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];
}