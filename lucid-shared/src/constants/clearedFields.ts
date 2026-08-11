/**
 * EXPLICIT CLEARED-FIELD DECLARATIONS
 * ===================================
 *
 * Some simulation fields encode their empty value as ABSENCE rather than as a
 * value: `Activity.queueRanking` is the current example — no key means "first
 * come, first served". Storage cannot round-trip that through a merge. The
 * write path is a merge (StorageAdapter.updateElementData reads the stored
 * q_data and layers the incoming payload over it, deliberately skipping
 * undefined-valued keys so a partial update cannot clobber stored width/height)
 * and the panel->extension transport is JSON, which drops undefined-valued keys
 * before the extension ever sees them.
 *
 * So a missing key is ambiguous. It means EITHER
 *   (a) the modeller just cleared the field, OR
 *   (b) this panel simply never mentions the field.
 *
 * Inferring (a) from absence is wrong and was a real defect: ConnectorsEditor
 * rebuilds an Activity from `connectType` + `financialProperties` only, so
 * selecting a connector whose source is a ranked Activity would have deleted
 * that Activity's stored queue ranking.
 *
 * The fix is to stop inferring. A payload that MEANS to clear a field says so,
 * by name, in a reserved key alongside the data:
 *
 *     { id, name, capacity, ..., __clearedFields: ['queueRanking'] }
 *
 * Properties of this signal:
 *   - Only a panel that OWNS the control can produce it, so a partial payload
 *     that merely omits the field is silent and the stored value survives.
 *   - It is an array of strings, so it survives JSON transport intact
 *     (`queueRanking: undefined` does not).
 *   - It is a declaration ABOUT the payload, not part of it. The extension
 *     takes it off with `takeClearedFields` before anything is registered or
 *     persisted, so the marker can never land in shape data or in exported
 *     model JSON.
 *   - Consumers decide what they will honour. Nothing here deletes anything;
 *     the receiving side intersects the declaration with the keys it allows to
 *     be deleted (see `activityStorageRemoveKeys`).
 */

/** Reserved payload key carrying an explicit cleared-field declaration. */
export const CLEARED_FIELDS_KEY = '__clearedFields';

/** A payload that may carry an explicit cleared-field declaration. */
export type WithClearedFields<T> = T & { [CLEARED_FIELDS_KEY]?: string[] };

/**
 * Copy `data`, marking `clearedFields` as affirmatively cleared by the caller.
 *
 * Only call this from a panel/write-back that renders (or otherwise fully owns)
 * the fields it names — the declaration is a promise that the payload speaks
 * for them. Declaring nothing returns the payload untouched, so the common
 * case adds no marker at all.
 *
 * The prototype is preserved so domain instances (e.g. Activity) stay instances.
 */
export function declareClearedFields<T extends object>(
    data: T,
    clearedFields: readonly string[]
): WithClearedFields<T> {
    if (!clearedFields.length) {
        return data as WithClearedFields<T>;
    }
    const marked: any = Object.assign(Object.create(Object.getPrototypeOf(data)), data);
    marked[CLEARED_FIELDS_KEY] = [...clearedFields];
    return marked;
}

/**
 * Split a payload into the declaration and the data that may be persisted.
 *
 * ALWAYS call this before storing or registering an incoming payload, for every
 * element type — the marker must never survive into stored shape data. Returns
 * the payload unchanged (same reference) when there is no marker, so the
 * overwhelmingly common no-declaration path allocates nothing.
 */
export function takeClearedFields<T extends object>(
    payload: T
): { data: T; clearedFields: readonly string[] } {
    const raw = payload == null ? undefined : (payload as any)[CLEARED_FIELDS_KEY];
    if (raw === undefined) {
        return { data: payload, clearedFields: [] };
    }
    const clearedFields = Array.isArray(raw)
        ? raw.filter((f: unknown): f is string => typeof f === 'string')
        : [];
    const data: any = Object.assign(Object.create(Object.getPrototypeOf(payload)), payload);
    delete data[CLEARED_FIELDS_KEY];
    return { data, clearedFields };
}
