import { ISerializedScenarioChangeRequest } from "./ISerializedScenarioChangeRequest";

export interface ISerializedScenario {
    id: string;
    name: string;
    description?: string;
    changeRequests: ISerializedScenarioChangeRequest[];
}
