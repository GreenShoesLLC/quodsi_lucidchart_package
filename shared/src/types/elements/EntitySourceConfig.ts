import { Duration } from "./Duration";
import { GeneratorType } from "./GeneratorType";
import { StateModification } from "./StateModification";

/**
 * Configuration for entity generation/creation.
 *
 * This interface encapsulates all timing and generation parameters needed to
 * create entities. It can be used by:
 * - Generator: Primary entity source at the start of a process
 * - Activity: Self-generating activity that can create its own entities
 *
 * Supports two generation modes:
 * - FREQUENCY: Traditional periodic interval-based generation
 * - TIME_DISTRIBUTED: Pattern-based generation using time patterns
 *
 * This corresponds to the Python EntitySourceConfig dataclass in the simulation engine.
 */
export interface EntitySourceConfig {
    /**
     * ID of the entity type to create
     */
    entityId: string;

    /**
     * Generation mode discriminator
     * - FREQUENCY: Periodic interval-based (default)
     * - TIME_DISTRIBUTED: Time-pattern-based
     */
    generatorType: GeneratorType;

    // ========== FREQUENCY mode fields ==========

    /**
     * Number of creation events to occur within each period
     * Only used when generatorType is FREQUENCY
     */
    periodicOccurrences?: number;

    /**
     * Duration between creation events
     * Only used when generatorType is FREQUENCY
     */
    periodIntervalDuration?: Duration;

    /**
     * Number of entities created per creation event
     * Only used when generatorType is FREQUENCY
     */
    entitiesPerCreation?: number;

    /**
     * Delay before first creation event
     * Only used when generatorType is FREQUENCY
     */
    periodicStartDuration?: Duration;

    /**
     * Maximum total entities to create
     * Only used when generatorType is FREQUENCY
     */
    maxEntities?: number;

    // ========== TIME_DISTRIBUTED mode fields ==========

    /**
     * IDs of TimeDistributedConfig objects that define the generation pattern
     * Only used when generatorType is TIME_DISTRIBUTED
     */
    timeDistributedConfigIds?: string[];

    // ========== Common fields ==========

    /**
     * State modifications to apply to newly created entities
     */
    initialStateModifications?: StateModification[];
}

/**
 * Creates a default EntitySourceConfig for FREQUENCY mode
 */
export function createDefaultEntitySourceConfig(
    entityId: string,
    periodIntervalDuration: Duration
): EntitySourceConfig {
    return {
        entityId,
        generatorType: GeneratorType.FREQUENCY,
        periodicOccurrences: Infinity,
        periodIntervalDuration,
        entitiesPerCreation: 1,
        maxEntities: Infinity,
        initialStateModifications: []
    };
}

/**
 * Creates an EntitySourceConfig for TIME_DISTRIBUTED mode
 */
export function createTimeDistributedEntitySourceConfig(
    entityId: string,
    timeDistributedConfigIds: string[]
): EntitySourceConfig {
    return {
        entityId,
        generatorType: GeneratorType.TIME_DISTRIBUTED,
        timeDistributedConfigIds,
        initialStateModifications: []
    };
}
