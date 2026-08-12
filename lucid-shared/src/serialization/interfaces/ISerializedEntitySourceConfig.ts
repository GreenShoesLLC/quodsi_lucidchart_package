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
     * Generation mode: 'FREQUENCY' or 'PATTERN'
     */
    generatorType: string;

    // FREQUENCY mode fields
    periodicOccurrences?: number;
    periodIntervalDuration?: ISerializedDuration;
    entitiesPerCreation?: number;
    periodicStartDuration?: ISerializedDuration;
    maxEntities?: number;

    // PATTERN mode fields. Lucid has no Pattern editor of its own (see
    // GeneratorEditor.tsx's read-only notice), but a generator authored as
    // PATTERN in Studio or drawio must still round-trip these losslessly
    // through Lucid — carried through opaquely, never written here.
    arrivalPatternId?: string;
    volume?: number;

    // Common fields
    initialStateModifications?: any[]; // StateModification[]
}
