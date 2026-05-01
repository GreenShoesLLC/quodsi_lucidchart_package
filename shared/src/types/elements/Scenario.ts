import { ScenarioChangeRequest } from "./ScenarioChangeRequest";
import { generateUUID } from "../../utils/uuidUtils";

/**
 * Legacy sentinel id used as the baseline scenario's `id` before
 * scenarios were persisted to a database. Two documents both stuck
 * with this id would collide on the global PK in `dbo.scenarios`.
 * New baselines now use real UUIDs; baseline-ness is identified via
 * the `isBaseline` flag, not the id. Kept exported solely so that
 * `ensureBaselineScenario` can recognise legacy serialised data and
 * migrate it on load.
 */
export const LEGACY_BASELINE_SCENARIO_ID = '00000000-0000-0000-0000-000000000000';

export class Scenario {
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
    }) {
        this.id = options?.id ?? generateUUID();
        this.name = options?.name ?? "New Scenario";
        this.description = options?.description ?? "";
        this.isBaseline = options?.isBaseline ?? false;
        this.changeRequests = options?.changeRequests ?? [];
    }

    addChangeRequest(changeRequest: ScenarioChangeRequest): void {
        this.changeRequests.push(changeRequest);
    }

    removeChangeRequest(changeRequestId: string): void {
        this.changeRequests = this.changeRequests.filter(cr => cr.id !== changeRequestId);
    }

    toJSON(): any {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            isBaseline: this.isBaseline,
            changeRequests: this.changeRequests.map(cr => cr.toJSON()),
        };
    }

    static fromJSON(data: any): Scenario {
        return new Scenario({
            id: data.id,
            name: data.name ?? "New Scenario",
            description: data.description ?? "",
            isBaseline: data.isBaseline ?? false,
            changeRequests: (data.changeRequests ?? []).map(
                (cr: any) => ScenarioChangeRequest.fromJSON(cr)
            ),
        });
    }

    static createBaseline(): Scenario {
        // id omitted -> constructor calls generateUUID(). Baselines are
        // identified by isBaseline === true, not by a sentinel id.
        return new Scenario({
            name: "Baseline",
            description: "No scenario changes",
            changeRequests: [],
            isBaseline: true,
        });
    }
}
