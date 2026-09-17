import {
    Action,
    SeizeAction,
    ReleaseAction,
} from '@quodsi/shared';

/**
 * Wire-cleanup Phase B2 Task 9: the clean wire's Action shapes ARE
 * `@quodsi/shared`'s own `Action` discriminated union — `type` is the
 * discriminator field now (renamed from `actionType`), and every per-type
 * field carries its clean name (`resourceRequirementId`, `modifications`,
 * `condition`, ...). There is no longer a separate Lucid-only serialized
 * action shape to hand-maintain in parallel with the domain type: these are
 * straight re-exports/aliases. `sparsifyAction()` (shared) — called from
 * inside `Activity.toJSON()`/`Connector.toJSON()` — is what actually
 * sparsifies an action at the serialization boundary (strips `condition:
 * null`, `keepResource: false`, empty action-list fields, etc.); this file
 * only names the WIRE shape, matching the shared type exactly.
 *
 * `ScriptAction` (new action type, absent from the pre-Task-9 interface
 * entirely) is included in the union via the shared re-export.
 */
export type ISerializedActionBase = Pick<Action, 'id' | 'type'> & { name?: string };
export type ISerializedSeizeAction = SeizeAction;
export type ISerializedReleaseAction = ReleaseAction;

/**
 * Union type for all serialized actions — identical to `@quodsi/shared`'s
 * `Action` union.
 */
export type ISerializedAction = Action;
