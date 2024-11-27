import { Scenario } from "./elements/scenario";


export interface PageStatus {
    hasContainer: boolean;
    scenarios: Scenario[];
    statusDateTime: string; // ISO format
}