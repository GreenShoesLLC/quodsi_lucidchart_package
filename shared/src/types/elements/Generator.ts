import { SimulationObjectType } from "./SimulationObjectType";
import { Duration } from "./Duration";
import { SimulationObject } from "./SimulationObject";
import { ModelDefaults } from "./ModelDefaults";

export class Generator implements SimulationObject {
  type: SimulationObjectType = SimulationObjectType.Generator;

  static createDefault(id: string): Generator {
    return new Generator(
      id,
      'New Generator',
      '', // activityKeyId
      ModelDefaults.DEFAULT_ENTITY_ID,
      Infinity, // periodicOccurrences
      new Duration(), // periodIntervalDuration
      1, // entitiesPerCreation
      new Duration(), // periodicStartDuration
      Infinity // maxEntities
    );
  }

  constructor(
    public id: string,
    public name: string,
    public activityKeyId: string = "",
    public entityId: string = ModelDefaults.DEFAULT_ENTITY_ID,
    public periodicOccurrences: number = Infinity,
    public periodIntervalDuration: Duration = new Duration(),
    public entitiesPerCreation: number = 1,
    public periodicStartDuration: Duration = new Duration(),
    public maxEntities: number = Infinity,
  ) { }
}