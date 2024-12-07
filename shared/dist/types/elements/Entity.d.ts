import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";
export declare class Entity implements SimulationObject {
    id: string;
    name: string;
    type: SimulationObjectType;
    static createDefault(id: string): Entity;
    constructor(id: string, name: string);
}
//# sourceMappingURL=Entity.d.ts.map