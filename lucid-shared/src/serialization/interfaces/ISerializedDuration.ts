import { Duration } from '@quodsi/shared';

/**
 * Wire-cleanup Phase B2 Task 9: the clean wire's Duration shape IS
 * `@quodsi/shared`'s `Duration` interface — flat, inline (`{value, unit}` for
 * a constant, `{distribution, ...paramsInline, unit}` otherwise), no
 * `durationPeriodUnit`/nested-`Distribution` wrapper. `Duration.toJSON(d)`
 * (shared) produces exactly this shape; every serializer call site now emits
 * it directly rather than hand-building `{durationPeriodUnit, distribution}`.
 * Kept as a distinct named type (not a bare re-export) so serializer/
 * interface call sites keep an explicit "this is the wire shape" name.
 */
export type ISerializedDuration = Duration;
