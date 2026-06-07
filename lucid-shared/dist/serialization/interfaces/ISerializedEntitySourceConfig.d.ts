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
    periodicOccurrences?: number;
    periodIntervalDuration?: ISerializedDuration;
    entitiesPerCreation?: number;
    periodicStartDuration?: ISerializedDuration;
    maxEntities?: number;
    timeDistributedConfigIds?: string[];
    initialStateModifications?: any[];
}
//# sourceMappingURL=ISerializedEntitySourceConfig.d.ts.map