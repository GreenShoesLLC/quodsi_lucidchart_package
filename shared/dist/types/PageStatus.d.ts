import { Scenario } from "./elements/Scenario";
export interface PageStatus {
    hasContainer: boolean;
    scenarios: Scenario[];
    statusDateTime: string;
}
