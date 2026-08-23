import type { ScenarioLever } from '@quodsi/shared';

/**
 * One entry of the page-level `q_resources` list (Lucid storage format 2).
 * Plain JSON — the same shape `Resource.toJSON()` emits, minus geometry:
 * x/y/width/height are NOT stored here; they follow the linked block at
 * build time. Transient link markers (shapeId/shapeLabel/laneRef) are never
 * stored either.
 */
export interface StoredResourceRecord {
    id: string;
    name: string;
    capacity?: number;
    description?: string;
    financialProperties?: {
        enabled: boolean;
        costPerSeize: number;
        costPerHourUtilized: number;
        costPerHourIdle: number;
    };
    levers?: ScenarioLever[];
}
