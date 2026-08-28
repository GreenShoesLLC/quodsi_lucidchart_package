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
    /** Opt-in link to a model-level `workSchedules` record (spec 2026-08-27
     *  §3.2). Present only when the resource follows a schedule; the record
     *  is written whole on every model-root patch, so a cleared link is
     *  simply a record without the key. */
    workScheduleId?: string;
    description?: string;
    financialProperties?: {
        enabled: boolean;
        costPerSeize: number;
        costPerHourUtilized: number;
        costPerHourIdle: number;
    };
    levers?: ScenarioLever[];
}
