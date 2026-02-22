import { Scenario } from "./Scenario";

export class ScenarioListManager {
    private scenarios: Map<string, Scenario> = new Map();

    add(scenario: Scenario): void {
        this.scenarios.set(scenario.id, scenario);
    }

    remove(scenarioId: string): boolean {
        return this.scenarios.delete(scenarioId);
    }

    get(scenarioId: string): Scenario | undefined {
        return this.scenarios.get(scenarioId);
    }

    getAll(): Scenario[] {
        return Array.from(this.scenarios.values());
    }

    size(): number {
        return this.scenarios.size;
    }

    clear(): void {
        this.scenarios.clear();
    }
}
