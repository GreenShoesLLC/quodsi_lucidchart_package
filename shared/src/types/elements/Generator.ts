import { SimulationObjectType } from "./SimulationObjectType";
import { Duration } from "./Duration";
import { SimulationObject } from "./SimulationObject";
import { ModelDefaults } from "./ModelDefaults";
import { PeriodUnit } from "./PeriodUnit";
import { DurationType } from "./DurationType";

export class Generator implements SimulationObject {
  type: SimulationObjectType = SimulationObjectType.Generator;

  static createDefault(id: string): Generator {
    return new Generator(
      id, //id
      'New Generator', //name
      '{SomeActivityName}', // activityKeyId
      ModelDefaults.DEFAULT_ENTITY_ID,
      10, // periodicOccurrences
      new Duration(1, PeriodUnit.HOURS, DurationType.CONSTANT), // periodIntervalDuration
      1, // entitiesPerCreation
      new Duration(0, PeriodUnit.HOURS, DurationType.CONSTANT), // periodicStartDuration
      999 // maxEntities
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