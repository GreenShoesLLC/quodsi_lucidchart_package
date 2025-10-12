import { ResourceRequirement } from "./elements/ResourceRequirement";
import { Connector } from "./elements/Connector";

export interface EditorReferenceData {
    entities?: Array<{ id: string, name: string }>;
    resources?: Array<{ id: string, name: string }>;
    activities?: Array<{ id: string, name: string }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];
}