import { ResourceRequirement } from "./elements/ResourceRequirement";
import { Connector } from "./elements/Connector";
import { ConnectType } from "./elements/ConnectType";

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
        operationStepRequirementIds?: string[]  // Requirement IDs used by operation steps
    }>;
    generators?: Array<{ id: string, name: string }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];
    states?: any[]; // Serialized state definitions for all components
}