import { ResourceRequirement } from "./elements/ResourceRequirement";
import { Connector } from "./elements/Connector";
import { ConnectType } from "./elements/ConnectType";
import { ISerializedTimePattern } from "../serialization/interfaces/ISerializedTimePattern";
import { ISerializedTimeDistributedConfig } from "../serialization/interfaces/ISerializedTimeDistributedConfig";
import { ISerializedScenario } from "../serialization/interfaces/ISerializedScenario";
import { SwimLaneContainment } from "./swimlane/SwimLaneQuodsiData";

/**
 * Reference data for React editors containing model-wide lookup data.
 *
 * This interface consolidates all reference data that editors need for
 * dropdowns, lookups, and cross-references. All data comes from the
 * ModelDefinition and is built by referenceDataBuilder.
 */
export interface EditorReferenceData {
    entities?: Array<{ id: string, name: string }>;
    resources?: Array<{ id: string, name: string }>;
    activities?: Array<{
        id: string,
        name: string,
        connectType?: ConnectType,
        actionRequirementIds?: string[]  // Requirement IDs used by actions
    }>;
    generators?: Array<{ id: string, name: string }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];
    states?: any[]; // Serialized state definitions for all components
    timePatterns?: ISerializedTimePattern[]; // Serialized time pattern definitions
    timeDistributedConfigs?: ISerializedTimeDistributedConfig[]; // Serialized time distributed config definitions
    scenarios?: ISerializedScenario[]; // Serialized scenario definitions
    swimLaneContainment?: SwimLaneContainment; // Swimlane lane containing the selected activity (if any)
}