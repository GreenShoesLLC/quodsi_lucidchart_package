import { SimulationObjectType } from "./SimulationObjectType";

export interface SimulationObject {
  id: string;
  name: string;
  description?: string;
  type: SimulationObjectType;
}




