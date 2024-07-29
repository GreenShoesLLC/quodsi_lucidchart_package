import { SimulationObjectType } from "./enums";
import { SimulationObject } from "./simulation_object";

export interface Connector extends SimulationObject {
  type: SimulationObjectType.Connector;
  fromActivityId: string;
  toActivityId?: string;
}
