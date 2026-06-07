import { SimulationObjectType } from "./SimulationObjectType";
import { PositionedSimulationObject } from "./PositionedSimulationObject";
export declare class Entity extends PositionedSimulationObject {
    id: string;
    name: string;
    type: SimulationObjectType;
    static createDefault(id: string, x?: number, y?: number): Entity;
    description: string;
    constructor(id: string, name: string, x?: number, y?: number);
}
//# sourceMappingURL=Entity.d.ts.map