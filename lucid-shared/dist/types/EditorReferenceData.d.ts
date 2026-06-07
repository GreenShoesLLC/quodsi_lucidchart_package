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
    entities?: Array<{
        id: string;
        name: string;
    }>;
    resources?: Array<{
        id: string;
        name: string;
    }>;
    activities?: Array<{
        id: string;
        name: string;
        connectType?: ConnectType;
        actionRequirementIds?: string[];
        /** Per-action summary for the change-request editor (Action picker + resource-requirement dropdown). */
        actions?: Array<{
            id: string;
            actionType: string;
            /** Reuses the same inline serialized-duration shape as generator periodIntervalDuration. */
            duration?: {
                durationPeriodUnit: string;
                distribution: {
                    distributionType: string;
                    parameters: Record<string, number>;
                    description?: string;
                };
            };
            resourceRequirementId?: string | null;
        }>;
    }>;
    generators?: Array<{
        id: string;
        name: string;
        periodIntervalDuration?: {
            durationPeriodUnit: string;
            distribution: {
                distributionType: string;
                parameters: Record<string, number>;
                description?: string;
            };
        };
    }>;
    resourceRequirements?: ResourceRequirement[];
    connectors?: Connector[];
    states?: any[];
    timePatterns?: ISerializedTimePattern[];
    timeDistributedConfigs?: ISerializedTimeDistributedConfig[];
    scenarios?: ISerializedScenario[];
    swimLaneContainment?: SwimLaneContainment;
}
//# sourceMappingURL=EditorReferenceData.d.ts.map