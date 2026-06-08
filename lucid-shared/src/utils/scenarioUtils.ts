import { ISerializedScenario } from "../serialization/interfaces/ISerializedScenario";
import { LEGACY_BASELINE_SCENARIO_ID, DomainScenario as Scenario } from "@quodsi/shared";
import { generateUUID } from "./uuidUtils";

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
export function ensureBaselineScenario(
    scenarios: ISerializedScenario[]
): { scenarios: ISerializedScenario[]; baselineAdded: boolean; migrated: boolean } {
    let migrated = false;
    scenarios = scenarios.map(s => {
        if (s.id === LEGACY_BASELINE_SCENARIO_ID) {
            migrated = true;
            return { ...s, id: generateUUID() };
        }
        return s;
    });

    const hasBaseline = scenarios.some(s => s.isBaseline === true);
    if (hasBaseline) {
        return { scenarios, baselineAdded: false, migrated };
    }
    const baseline = Scenario.createBaseline().toJSON();
    return {
        scenarios: [baseline, ...scenarios],
        baselineAdded: true,
        migrated,
    };
}
