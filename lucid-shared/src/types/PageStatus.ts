import { SimulationRun } from "./elements/SimulationRun";


export interface PageStatus {
    hasContainer: boolean;
    simulationRuns: SimulationRun[];
    statusDateTime: string; // ISO format
}