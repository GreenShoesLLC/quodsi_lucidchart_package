import type { ISerializedModel } from '../serialization/interfaces/ISerializedModel';
/**
 * Reduced, read-only model catalog relayed into the embedded Studio scenarios
 * editor. MUST stay structurally compatible with quodsi_studio's
 * `RelayedCatalog` (src/platforms/lucid-embed/relayProtocol.ts) — it crosses
 * the postMessage boundary as plain JSON, so the two libs are bridged by shape.
 */
export interface EmbedModelCatalog {
    activities: Array<{
        id: string;
        name: string;
        actions?: Array<{
            id?: string;
            actionType: string;
            duration?: unknown;
            resourceRequirementId?: string | null;
        }>;
    }>;
    resources: Array<{
        id: string;
        name: string;
    }>;
    resourceRequirements: Array<{
        id: string;
        name: string;
    }>;
    generators: Array<{
        id: string;
        name: string;
        generationConfig?: {
            periodIntervalDuration?: unknown;
        };
    }>;
    connectors: Array<{
        id: string;
        name: string;
    }>;
    entities: Array<{
        id: string;
        name: string;
    }>;
}
type ModelInput = Partial<ISerializedModel>;
export declare function reduceModelToCatalog(model: ModelInput): EmbedModelCatalog;
export {};
//# sourceMappingURL=reduceModelToCatalog.d.ts.map