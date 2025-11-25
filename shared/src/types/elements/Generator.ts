import { SimulationObjectType } from "./SimulationObjectType";
import { Duration } from "./Duration";
import { PositionedSimulationObject } from "./PositionedSimulationObject";
import { ModelDefaults } from "./ModelDefaults";
import { PeriodUnit } from "./PeriodUnit";
import { ConstantDistribution } from "./distributions";
import { StateModification } from "./StateModification";
import { GeneratorType } from "./GeneratorType";
import { ExponentialDistribution } from "./distributions";

export class Generator extends PositionedSimulationObject {
    type: SimulationObjectType = SimulationObjectType.Generator;

    /**
     * Generator type discriminator
     * - FREQUENCY: Traditional periodic interval-based generation (default)
     * - TIME_DISTRIBUTED: Time-pattern-based distribution
     */
    generatorType: GeneratorType = GeneratorType.FREQUENCY;

    /**
     * Initial state modifications for created entities
     */
    initialStateModifications: StateModification[] = [];

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
            999999, // periodicOccurrences
            new Duration(PeriodUnit.HOURS, ExponentialDistribution.create(1)), // periodIntervalDuration
            1, // entitiesPerCreation
            new Duration(PeriodUnit.HOURS, ConstantDistribution.create(0)), // periodicStartDuration
            999999 // maxEntities
        );

        // Set location using inherited method
        generator.setLocation(x, y);

        return generator;
    }

    /**
     * List of TimeDistributedConfig IDs (used for TIME_DISTRIBUTED generators)
     */
    timeDistributedConfigIds: string[] = [];

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