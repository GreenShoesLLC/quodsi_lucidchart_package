import { SimulationObjectType } from "./SimulationObjectType";
import { Duration } from "./Duration";
import { PositionedSimulationObject } from "./PositionedSimulationObject";
import { ModelDefaults } from "./ModelDefaults";
import { PeriodUnit } from "./PeriodUnit";
import { DurationType } from "./DurationType";
import { ConstantDistribution } from "./distributions";

export class Generator extends PositionedSimulationObject {
    type: SimulationObjectType = SimulationObjectType.Generator;

    static createDefault(
        id: string, 
        x: number = 0, 
        y: number = 0
    ): Generator {
        const generator = new Generator(
            id,
            'New Generator',
            '{SomeActivityName}',
            ModelDefaults.DEFAULT_ENTITY_ID,
            10, // periodicOccurrences
            new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)), // periodIntervalDuration
            1, // entitiesPerCreation
            new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)), // periodicStartDuration
            999 // maxEntities
        );

        // Set location using inherited method
        generator.setLocation(x, y);

        return generator;
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
        x: number = 0,
        y: number = 0
    ) { 
        super();
        // Set location using inherited method
        this.setLocation(x, y);
    }
}