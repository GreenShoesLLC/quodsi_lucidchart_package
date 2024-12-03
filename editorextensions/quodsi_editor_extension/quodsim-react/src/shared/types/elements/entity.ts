import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";

export class Entity implements SimulationObject {
  type: SimulationObjectType = SimulationObjectType.Entity;

  constructor(
    public id: string,
    public name: string,
  ) { }
}
