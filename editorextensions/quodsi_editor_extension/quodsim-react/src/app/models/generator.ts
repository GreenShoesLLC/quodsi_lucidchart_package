import { SimulationObjectType } from "./enums/simulationObjectType";
import { Duration } from "./duration";
import { PeriodUnit } from "./enums/PeriodUnit";


export class Generator {
  type: SimulationObjectType = SimulationObjectType.Generator;

  constructor(
    public id: string,
    public activityKeyId: string = "",
    public entityType: string = "All",
    public periodicOccurrences: number = Infinity,
    public periodIntervalDuration: Duration = new Duration(),
    public entitiesPerCreation: number = 1,

    public periodicStartDuration: Duration = new Duration(),
    public maxEntities: number = Infinity,

  ) { }
}
