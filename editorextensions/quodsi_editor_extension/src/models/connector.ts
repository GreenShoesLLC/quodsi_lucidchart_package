import { SimulationObjectType } from "./enums/simulationObjectType";
import { SimulationObject } from "./simulation_object";
import { OperationStep } from "./operationStep";
import { ConnectType } from "./enums/connectType";

export class Connector {
  type: SimulationObjectType = SimulationObjectType.Connector;

  constructor(
    public id: string,
    public name: string,
    public probability: number = 1.0,
    public connectType: ConnectType = ConnectType.Probability,
    public operationSteps: OperationStep[] = []
  ) { }
}
