import { Scenario } from "../models/elements/scenario";
export interface PageStatus {
    hasContainer: boolean;
    scenarios: Scenario[];
    statusDateTime: string;
}
