import { Scenario } from "./Scenario";
export declare class ScenarioListManager {
    private scenarios;
    add(scenario: Scenario): void;
    remove(scenarioId: string): boolean;
    get(scenarioId: string): Scenario | undefined;
    getAll(): Scenario[];
    size(): number;
    clear(): void;
}
//# sourceMappingURL=ScenarioListManager.d.ts.map