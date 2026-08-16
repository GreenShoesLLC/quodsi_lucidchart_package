import { ScenarioLever } from '@quodsi/shared';
import { ISerializedAction } from './ISerializedAction';

/**
 * Wire-cleanup Phase B2 Task 9 (fix round, review F3): ground-truthed
 * against `CleanConnectorDoc` (engine `document/clean/routing.py`) — no
 * `type` class-tag; no `description` slot at all (dropped unconditionally
 * by `Connector.toJSON()` — the clean reader is `extra="forbid"`).
 * `destinationPriority` renamed to `priority`; `entityTemplateUniqueId`
 * renamed to `entityId`; `stateCondition` renamed to `condition`; the old
 * standalone `stateModifications` array has NO clean-wire equivalent —
 * connector-level state changes are expressed as an ASSIGN action inside
 * `actions` now. `weight` is the one field that is NEVER sparse-omitted,
 * even at its 1-default (spec ruling).
 *
 * Geometry correction (initial pass wrongly claimed "no geometry
 * whatsoever" — `CleanConnectorDoc` DOES carry `sourceX`/`sourceY`/
 * `targetX`/`targetY` as display-only `float = Field(default=0.0, ...)`
 * fields, `routing.py:284-287`). The ONLY geometry genuinely absent is the
 * midpoint `x`/`y` (no such field on `CleanConnectorDoc` at all — that pair
 * really is dropped, not renamed). `Connector.toJSON()` (shared) already
 * emits `sourceX`/`sourceY`/`targetX`/`targetY`, sparse-omitted at 0.
 */
export interface ISerializedConnector {
    id: string;
    name: string;
    sourceId: string;
    targetId: string;
    weight: number;
    priority?: number;
    entityId?: string;
    condition?: any; // StateCondition JSON ({stateId, comparison, value})
    sourceX?: number;
    sourceY?: number;
    targetX?: number;
    targetY?: number;

    // Action-based system
    actions?: ISerializedAction[];

    // Scenario-lever authoring metadata; only present when the connector declares
    // levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}
