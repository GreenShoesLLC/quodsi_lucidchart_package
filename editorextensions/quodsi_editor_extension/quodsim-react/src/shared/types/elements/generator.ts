import { SimulationObjectType } from "./SimulationObjectType";
import { Duration } from "./Duration";
import { SimulationObject } from "./SimulationObject";


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
