import { ScenarioLever } from '@quodsi/shared';
import { ISerializedAction } from './ISerializedAction';

/**
 * Wire-cleanup Phase B2 Task 9: ground-truthed against `CleanConnectorDoc`
 * (engine `document/clean/routing.py`) — no `type` class-tag; no
 * `description` slot at all (dropped unconditionally by `Connector.toJSON()`
 * — the clean reader is `extra="forbid"`); no midpoint `x`/`y`, and no
 * `sourceX`/`sourceY`/`targetX`/`targetY` slot at all — `CleanConnectorDoc`
 * carries NO geometry whatsoever (verified against the engine schema: only
 * `id`/`name`/`sourceId`/`targetId`/`weight`/`priority`/`entityId`/
 * `condition`/`actions`). `destinationPriority` renamed to `priority`;
 * `entityTemplateUniqueId` renamed to `entityId`; `stateCondition` renamed
 * to `condition`; the old standalone `stateModifications` array has NO
 * clean-wire equivalent — connector-level state changes are expressed as an
 * ASSIGN action inside `actions` now. `weight` is the one field that is
 * NEVER sparse-omitted, even at its 1-default (spec ruling).
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

    // Action-based system
    actions?: ISerializedAction[];

    // Scenario-lever authoring metadata; only present when the connector declares
    // levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}
