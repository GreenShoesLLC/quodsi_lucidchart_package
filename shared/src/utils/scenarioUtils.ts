import { ISerializedScenario } from "../serialization/interfaces/ISerializedScenario";
import { Scenario } from "../types/elements/Scenario";

export function ensureBaselineScenario(
    scenarios: ISerializedScenario[]
): { scenarios: ISerializedScenario[]; baselineAdded: boolean } {
    const hasBaseline = scenarios.some(s => s.isBaseline === true);
    if (hasBaseline) {
        return { scenarios, baselineAdded: false };
    }
    const baseline = Scenario.createBaseline().toJSON();
    return {
        scenarios: [baseline, ...scenarios],
        baselineAdded: true,
    };
}
