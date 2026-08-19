/**
 * Wire shape of one ArrivalPattern — a model-level list entry, sibling of
 * `scenarios` on ModelDefinition.
 *
 * Every field beyond `id`/`name` is optional because ArrivalPattern.toJSON()
 * omits at its own defaults (wire-cleanup Phase B2 Task 7): `cycle`,
 * `seasonMode` and `countMode` omit at their default members, the weight
 * arrays omit when empty, and `withinHourOffset` omits when it is still the
 * constructor's uniform(0, 60). An absent key therefore reads back as that
 * default — do not "helpfully" materialize them here.
 */
export interface ISerializedArrivalPattern {
    id: string;
    name: string;
    cycle?: string;
    seasonMode?: string;
    seasonWeights?: number[];
    dayOfWeekWeights?: number[];
    hourWeights?: number[];
    countMode?: string;
    withinHourOffset?: Record<string, unknown>;
}
