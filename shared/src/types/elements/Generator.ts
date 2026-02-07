import { SimulationObjectType } from "./SimulationObjectType";
import { Duration } from "./Duration";
import { FlowNode } from "./FlowNode";
import { ModelDefaults } from "./ModelDefaults";
import { PeriodUnit } from "./PeriodUnit";
import { ExponentialDistribution } from "./distributions";
import { EntitySourceConfig, createDefaultEntitySourceConfig } from "./EntitySourceConfig";

export class Generator extends FlowNode {
    type: SimulationObjectType = SimulationObjectType.Generator;

    /**
     * Required configuration for entity generation.
     * Contains entityId, generatorType, timing parameters, and state modifications.
     */
    generationConfig: EntitySourceConfig;

    /**
     * Optional exit connector destination (activity ID).
     * Generators route all created entities to this single destination.
     */
    exitConnector?: string;

    static createDefault(
        id: string,
        x: number = 0,
        y: number = 0
    ): Generator {
        const defaultDuration = new Duration(PeriodUnit.HOURS, ExponentialDistribution.create(1));
        const generationConfig = createDefaultEntitySourceConfig(
            ModelDefaults.DEFAULT_ENTITY_ID,
            defaultDuration
        );
        generationConfig.periodicOccurrences = 999999;
        generationConfig.maxEntities = 999999;

        return new Generator(id, 'New Generator', generationConfig, undefined, x, y);
    }

    description: string = '';

    constructor(
        public id: string,
        public name: string,
        generationConfig: EntitySourceConfig,
        exitConnector?: string,
        x: number = 0,
        y: number = 0
    ) {
        super();
        this.generationConfig = generationConfig;
        this.exitConnector = exitConnector;
        this.setLocation(x, y);
    }
}
