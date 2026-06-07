import { ISerializedScenarioChangeRequest } from "./ISerializedScenarioChangeRequest";
export interface ISerializedScenario {
    id: string;
    name: string;
    description?: string;
    isBaseline?: boolean;
    changeRequests: ISerializedScenarioChangeRequest[];
}
//# sourceMappingURL=ISerializedScenario.d.ts.map