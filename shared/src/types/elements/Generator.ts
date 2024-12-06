import { SimulationObjectType } from "./SimulationObjectType";
import { Duration } from "./Duration";
import { SimulationObject } from "./SimulationObject";
import { ModelDefaults } from "./ModelDefaults";


export class Generator implements SimulationObject {
  type: SimulationObjectType = SimulationObjectType.Generator;

  constructor(
    public id: string,
    public name: string,
    public activityKeyId: string = "",
    public entityId: string = ModelDefaults.DEFAULT_ENTITY_ID, // Changed from entityType
    public periodicOccurrences: number = Infinity,
    public periodIntervalDuration: Duration = new Duration(),
    public entitiesPerCreation: number = 1,

    public periodicStartDuration: Duration = new Duration(),
    public maxEntities: number = Infinity,

  ) { }
}
