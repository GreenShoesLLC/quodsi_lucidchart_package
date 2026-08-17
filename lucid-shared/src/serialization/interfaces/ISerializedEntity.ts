/**
 * Wire-cleanup Phase B2 Task 9: ground-truthed against `CleanEntityDoc`
 * (engine `document/clean/elements.py`) — no `type` class-tag (the array key
 * `entities` already discriminates); `x`/`y` sparse-omitted at 0 by
 * `Entity.toJSON()`; `width`/`height` have NO slot at all on the clean wire
 * (dropped unconditionally by `Entity.toJSON()`, never emitted here).
 */
export interface ISerializedEntity {
    id: string;
    name: string;
    description?: string;
    x?: number;
    y?: number;
}
