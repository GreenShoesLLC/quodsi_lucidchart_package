/**
 * Wire shape of one ArrivalSchedule — a model-level list entry, sibling of
 * `arrivalPatterns` on ModelDefinition.
 *
 * `id` and `name` are always present; `timeUnit` and `arrivals` are optional
 * because ArrivalSchedule.toJSON() omits at its own defaults (wire-cleanup
 * Phase B2 Task 7): `timeUnit` omits at its constructor default
 * (`PeriodUnit.MINUTES`), and `arrivals` omits when empty. An absent key
 * therefore reads back as that default — do not "helpfully" materialize
 * them here.
 *
 * There is deliberately no `source` field: `ArrivalSchedule.toJSON()` drops
 * `source` UNCONDITIONALLY, not sparsely — the engine's clean document has
 * no slot for it at all (only `{ kind: 'inline' }` ever existed). Do not
 * "restore" it here.
 */
export interface ISerializedArrivalSchedule {
    id: string;
    name: string;
    timeUnit?: string;
    arrivals?: Array<{
        time: string | number;
        entityId?: string;
        quantity?: number;
        stateValues?: Record<string, string | number | boolean>;
    }>;
}
