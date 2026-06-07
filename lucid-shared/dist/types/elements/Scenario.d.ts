import { ScenarioChangeRequest } from "./ScenarioChangeRequest";
/**
 * Legacy sentinel id used as the baseline scenario's `id` before
 * scenarios were persisted to a database. Two documents both stuck
 * with this id would collide on the global PK in `dbo.scenarios`.
 * New baselines now use real UUIDs; baseline-ness is identified via
 * the `isBaseline` flag, not the id. Kept exported solely so that
 * `ensureBaselineScenario` can recognise legacy serialised data and
 * migrate it on load.
 */
export declare const LEGACY_BASELINE_SCENARIO_ID = "00000000-0000-0000-0000-000000000000";
export declare class Scenario {
    id: string;
    name: string;
    description: string;
    isBaseline: boolean;
    changeRequests: ScenarioChangeRequest[];
    constructor(options?: {
        id?: string;
        name?: string;
        description?: string;
        isBaseline?: boolean;
        changeRequests?: ScenarioChangeRequest[];
    });
    addChangeRequest(changeRequest: ScenarioChangeRequest): void;
    removeChangeRequest(changeRequestId: string): void;
    toJSON(): any;
    static fromJSON(data: any): Scenario;
    static createBaseline(): Scenario;
}
//# sourceMappingURL=Scenario.d.ts.map