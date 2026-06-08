import { SimulationRun } from '@quodsi/shared';


export interface PageStatus {
    hasContainer: boolean;
    simulationRuns: SimulationRun[];
    statusDateTime: string; // ISO format
}