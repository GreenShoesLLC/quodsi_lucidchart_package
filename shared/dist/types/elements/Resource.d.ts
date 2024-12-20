import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";
export declare class Resource implements SimulationObject {
    id: string;
    name: string;
    capacity: number;
    type: SimulationObjectType;
    static createDefault(id: string): Resource;
    constructor(id: string, name: string, capacity?: number);
}
//# sourceMappingURL=Resource.d.ts.map