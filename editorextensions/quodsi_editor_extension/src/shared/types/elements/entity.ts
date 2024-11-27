import { SimulationObjectType } from "./enums/simulationObjectType";
import { SimulationObject } from "./simulation_object";

export class Entity implements SimulationObject {
  type: SimulationObjectType = SimulationObjectType.Entity;

  constructor(
    public id: string,
    public name: string,
  ) { }
}
