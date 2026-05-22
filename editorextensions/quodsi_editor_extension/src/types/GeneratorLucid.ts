import { BlockProxy } from 'lucid-extension-sdk';
import {
    ConstantDistribution,
    Duration,
    Generator,
    ModelDefaults,
    PeriodUnit,
    SimulationObjectType,
    ComponentLogger,
    StateModification,
    parseStructuredName,
    extractGeneratorFields,
    EntitySourceConfig,
    createDefaultEntitySourceConfig,
    GeneratorType,
    MappingSource
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';

// Define a constant for the logger prefix
const LOG_PREFIX = '[GeneratorLucid]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Enable or disable logging for GeneratorLucid
 */
export const setGeneratorLucidLogging = (enabled: boolean): void => {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

interface StoredGeneratorData {
    id: string;
    name?: string;
    description?: string;
    x?: number;
    y?: number;
    // Optional shape dimensions in SVG userSpace (Path X-lite).
    width?: number;
    height?: number;
    generationConfig?: EntitySourceConfig;
    exitConnector?: string;
}

/**
 * Lucid-specific implementation of a Generator.
 * Maps a Lucid Block element to a simulation Generator.
 */
export class GeneratorLucid extends SimObjectLucid<Generator> {
    constructor(
        block: BlockProxy,
        storageAdapter: StorageAdapter
    ) {
        ComponentLogger.log(LOG_PREFIX, `Constructing GeneratorLucid for block ID: ${block.id}`);
        super(block, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Generator;
    }

    protected createSimObject(): Generator {
        ComponentLogger.log(LOG_PREFIX, `Creating Generator simulation object for element ID: ${this.platformElementId}`);

        // Get stored custom data first
        const storedData = this.storageAdapter.getElementData(this.element) as StoredGeneratorData;

        // Get or create default generationConfig
        const generationConfig: EntitySourceConfig = storedData?.generationConfig || createDefaultEntitySourceConfig(
            ModelDefaults.DEFAULT_ENTITY_ID,
            new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1))
        );

        // Set default values for periodicOccurrences and maxEntities if not set
        // Using == null catches both null and undefined for robustness with legacy data
        if (generationConfig.periodicOccurrences == null || generationConfig.periodicOccurrences === Infinity) {
            generationConfig.periodicOccurrences = 999999;
        }
        if (generationConfig.maxEntities == null || generationConfig.maxEntities === Infinity) {
            generationConfig.maxEntities = 999999;
        }

        // Create generator with new constructor
        const generator = new Generator(
            this.platformElementId,
            storedData?.name || 'New Generator',
            generationConfig,
            storedData?.exitConnector,
            storedData?.x ?? 0,
            storedData?.y ?? 0
        );

        // Restore description
        if (storedData?.description !== undefined) {
            generator.description = storedData.description;
        }

        // Deserialize initial state modifications if stored as JSON
        if (generationConfig.initialStateModifications) {
            generationConfig.initialStateModifications = generationConfig.initialStateModifications.map(
                (mod: any) => mod instanceof StateModification ? mod : StateModification.fromJSON(mod)
            );
        }

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(generator);

        return generator;
    }

    private updatePlatformSpecificFields(generator: Generator): void {
        const block = this.element as BlockProxy;

        // Update location AND shape size from current platform (Path X-lite).
        const box = block.getBoundingBox();
        generator.setLocation(box.x ?? generator.x, box.y ?? generator.y);
        generator.width = box.w;
        generator.height = box.h;

        // Update name if needed
        if (!generator.name || generator.name === 'New Generator') {
            generator.name = this.getElementName('Generator');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            x: generator.x,
            y: generator.y,
            width: generator.width,
            height: generator.height,
            name: generator.name
        });
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Generator from platform for element ID: ${this.platformElementId}`);

        // Extract location AND shape size from platform (Path X-lite).
        const box = (this.element as BlockProxy).getBoundingBox();

        // Update location
        this.simObject.setLocation(
            box.x ?? this.simObject.x,
            box.y ?? this.simObject.y
        );
        this.simObject.width = box.w;
        this.simObject.height = box.h;

        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Generator');
        }

        // Store updated data with generationConfig
        const dataToStore: StoredGeneratorData = {
            id: this.platformElementId,
            name: this.simObject.name,
            description: this.simObject.description,
            x: this.simObject.x,
            y: this.simObject.y,
            width: this.simObject.width,
            height: this.simObject.height,
            generationConfig: {
                entityId: this.simObject.generationConfig.entityId,
                generatorType: this.simObject.generationConfig.generatorType,
                periodicOccurrences: this.simObject.generationConfig.periodicOccurrences,
                periodIntervalDuration: this.simObject.generationConfig.periodIntervalDuration,
                entitiesPerCreation: this.simObject.generationConfig.entitiesPerCreation,
                periodicStartDuration: this.simObject.generationConfig.periodicStartDuration,
                maxEntities: this.simObject.generationConfig.maxEntities,
                timeDistributedConfigIds: this.simObject.generationConfig.timeDistributedConfigIds,
                initialStateModifications: this.simObject.generationConfig.initialStateModifications?.map(
                    m => m instanceof StateModification ? m.toJSON() : m
                )
            },
            exitConnector: this.simObject.exitConnector
        };

        ComponentLogger.log(LOG_PREFIX, `Storing updated data for element ID: ${this.platformElementId}`, dataToStore);
        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        const block = this.element as BlockProxy;

        // Check for text areas on the block
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    const name = text.trim();
                    ComponentLogger.log(LOG_PREFIX, `Using text area content as name for element ID ${block.id}: ${name}`);
                    return name;
                }
            }
        }

        // If no text found, use class name
        const className = block.getClassName() || 'Block';
        const name = `${defaultPrefix} ${className}`;
        ComponentLogger.log(LOG_PREFIX, `Generated default name for element ID ${block.id}: ${name}`);
        return name;
    }

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource): GeneratorLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating GeneratorLucid from conversion for block ID: ${block.id}, mappingSource: ${mappingSource}`);

        // Extract location AND shape size (Path X-lite)
        const box = block.getBoundingBox();

        // Create default generator using the static method with location
        const defaultGenerator = Generator.createDefault(
            block.id,
            box.x ?? 0,
            box.y ?? 0
        );
        defaultGenerator.width = box.w;
        defaultGenerator.height = box.h;

        // Get raw name and parse for structured data
        const rawName = SimObjectLucid.getNameFromBlock(block, 'Generator');
        const parsed = parseStructuredName(rawName);
        const fields = extractGeneratorFields(parsed);

        ComponentLogger.log(LOG_PREFIX, `Parsed structured name for block ${block.id}:`, { rawName, fields });

        // Update shape text to clean name if we parsed structured data
        if (rawName.includes('|') && fields.name) {
            SimObjectLucid.updateBlockText(block, fields.name);
        }

        // Build generationConfig from defaults and parsed fields
        const generationConfig: EntitySourceConfig = {
            entityId: defaultGenerator.generationConfig.entityId,
            generatorType: GeneratorType.FREQUENCY,
            periodicOccurrences: fields.periodicOccurrences ?? defaultGenerator.generationConfig.periodicOccurrences,
            periodIntervalDuration: fields.interval !== undefined
                ? new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(fields.interval))
                : defaultGenerator.generationConfig.periodIntervalDuration,
            entitiesPerCreation: fields.entitiesPerCreation ?? defaultGenerator.generationConfig.entitiesPerCreation,
            periodicStartDuration: defaultGenerator.generationConfig.periodicStartDuration,
            maxEntities: fields.maxEntities ?? defaultGenerator.generationConfig.maxEntities,
            timeDistributedConfigIds: [],
            initialStateModifications: []
        };

        if (fields.interval !== undefined) {
            ComponentLogger.log(LOG_PREFIX, `Using parsed interval: ${fields.interval} minutes`);
        }

        // Convert to StoredGeneratorData format
        const storedData: StoredGeneratorData = {
            id: defaultGenerator.id,
            name: fields.name || rawName,
            x: defaultGenerator.x,
            y: defaultGenerator.y,
            width: defaultGenerator.width,
            height: defaultGenerator.height,
            generationConfig: generationConfig,
            exitConnector: defaultGenerator.exitConnector
        };

        ComponentLogger.log(LOG_PREFIX, `Setting initial data for converted generator, block ID: ${block.id}`, storedData);

        // Set up element data (type + component data merged into single q_data)
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.Generator,
            {
                mappingSource: mappingSource
            }
        );

        // Now create the GeneratorLucid instance
        return new GeneratorLucid(block, storageAdapter);
    }
}
