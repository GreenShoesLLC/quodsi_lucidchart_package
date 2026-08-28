/**
 * Wire shape of one WorkSchedule — a model-level list entry, sibling of
 * `arrivalSchedules` on ModelDefinition (spec
 * `docs/superpowers/specs/2026-08-27-work-schedules-design.md` §3.1).
 *
 * `id` and `name` are always present; everything else is optional because
 * `WorkSchedule.toJSON()` omits at its own defaults: `offShiftCapacity`
 * omit@0, `offShiftRule` omit@`'finish'`, `pattern`/`exceptions` omit@empty.
 * An absent key therefore reads back as that default — do not "helpfully"
 * materialize them here.
 *
 * There is deliberately no `type` field. `WorkSchedule.type` is
 * `SimulationObjectType.None` (the same pre-existing quirk State /
 * ArrivalPattern / ArrivalSchedule carry) and the engine's
 * `CleanWorkScheduleDoc` — an `extra="forbid"` parser — has no slot for one,
 * so `toJSON()` never emits it and Lucid's `q_work_schedules` never stores
 * it.
 *
 * `pattern` rows and `exceptions` entries are declared inline rather than
 * imported from `@quodsi/shared` for the same reason every other
 * ISerialized* interface in this folder is hand-declared: this is the WIRE
 * contract, ground-truthed against the engine's clean document, and it must
 * be free to disagree with the class when the class is wrong.
 */
export interface ISerializedWorkSchedule {
    id: string;
    name: string;
    offShiftCapacity?: number;
    offShiftRule?: string;
    pattern?: Array<{
        days: string[];
        start: string;
        end: string;
        capacity: number;
    }>;
    exceptions?: Array<{
        from: string;
        to?: string;
        capacity: number;
        note?: string;
    }>;
}
