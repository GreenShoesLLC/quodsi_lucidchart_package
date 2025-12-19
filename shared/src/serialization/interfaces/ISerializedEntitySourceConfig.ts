import { ISerializedDuration } from './ISerializedDuration';

/**
 * Serialized EntitySourceConfig
 *
 * Represents the configuration for entity generation, used by both
 * Generator (generationConfig) and Activity (sourceConfig for self-generating activities).
 */
export interface ISerializedEntitySourceConfig {
    /**
     * ID of the entity type to create
     */
    entityId: string;

    /**
     * Generation mode: 'FREQUENCY' or 'TIME_DISTRIBUTED'
     */
    generatorType: string;

    // FREQUENCY mode fields
    periodicOccurrences?: number;
    periodIntervalDuration?: ISerializedDuration;
    entitiesPerCreation?: number;
    periodicStartDuration?: ISerializedDuration;
    maxEntities?: number;

    // TIME_DISTRIBUTED mode fields
    timeDistributedConfigIds?: string[];

    // Common fields
    initialStateModifications?: any[]; // StateModification[]
}
