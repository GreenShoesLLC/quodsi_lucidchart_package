import { SimulationObjectType } from "./enums/simulationObjectType";
import { Duration } from "./duration";
import { SimulationObject } from "./simulation_object";


export class Generator implements SimulationObject {
  type: SimulationObjectType = SimulationObjectType.Generator;

  constructor(
    public id: string,
    public name: string,
    public activityKeyId: string = "",
    public entityType: string = "All",
    public periodicOccurrences: number = Infinity,
    public periodIntervalDuration: Duration = new Duration(),
    public entitiesPerCreation: number = 1,

    public periodicStartDuration: Duration = new Duration(),
    public maxEntities: number = Infinity,

  ) { }
}
