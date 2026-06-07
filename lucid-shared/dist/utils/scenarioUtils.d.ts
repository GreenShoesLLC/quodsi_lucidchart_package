import { ISerializedScenario } from "../serialization/interfaces/ISerializedScenario";
/**
 * Ensure exactly one baseline scenario exists in the page's persisted
 * scenario list, and migrate any legacy zero-UUID baselines (predates
 * the database) to fresh UUIDs.
 *
 * Returns the (possibly modified) scenarios array along with two flags
 * the caller uses to decide whether to write back to Lucid storage:
 *   - baselineAdded: true when a missing baseline was synthesised
 *   - migrated: true when an existing scenario's id was rewritten
 */
export declare function ensureBaselineScenario(scenarios: ISerializedScenario[]): {
    scenarios: ISerializedScenario[];
    baselineAdded: boolean;
    migrated: boolean;
};
//# sourceMappingURL=scenarioUtils.d.ts.map