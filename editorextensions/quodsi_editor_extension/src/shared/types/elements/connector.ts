import { SimulationObjectType } from "./enums/simulationObjectType";
import { OperationStep } from "./operationStep";
import { ConnectType } from "./enums/connectType";
import { SimulationObject } from "./simulation_object";

export class Connector implements SimulationObject {
  type: SimulationObjectType = SimulationObjectType.Connector;

  constructor(
    public id: string,
    public name: string,
    public probability: number = 1.0,
    public connectType: ConnectType = ConnectType.Probability,
    public operationSteps: OperationStep[] = []
  ) { }
}
