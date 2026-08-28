import { ScenarioLever } from '@quodsi/shared';

/**
 * Wire-cleanup Phase B2 Task 9: ground-truthed against `CleanResourceDoc`
 * (engine `document/clean/elements.py`) — no `type` class-tag. `capacity`
 * sparse-omitted at 1; `financialProperties` omitted whole-key when disabled
 * AND every numeric field is at its class default; `levers`/`description`
 * omitted when empty. `width`/`height` DO have a slot (`Optional[float]`).
 */
export interface ISerializedResource {
    id: string;
    name: string;
    description?: string;
    x?: number;
    y?: number;
    width?: number;   // Path X-lite: SVG userSpace shape size; absent for legacy models
    height?: number;
    capacity?: number;
    /**
     * Opt-in link to a model-level `workSchedules` record (spec §3.2). When
     * present the run reads capacity from the schedule and `capacity` above
     * is NOMINAL only (reporting). Omitted when absent — `Resource.toJSON()`
     * treats absent and `''` alike.
     */
    workScheduleId?: string;
    financialProperties?: any;
    // Scenario-lever authoring metadata; only present when the component declares
    // levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}
