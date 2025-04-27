import { BlockProxy } from 'lucid-extension-sdk';
import { 
    ConstantDistribution,
    Distribution,
    Duration,
    DurationType,
    Generator,
    ModelDefaults,
    PeriodUnit,
    SimulationObjectType,
    ComponentLogger 
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
    x?: number;  // Added x coordinate
    y?: number;  // Added y coordinate
    name?: string;
    activityKeyId?: string;
    entityId?: string;
    periodicOccurrences?: number;
    periodIntervalDuration?: {
        durationPeriodUnit: PeriodUnit;
        distribution: Distribution;
    };
    entitiesPerCreation?: number;
    periodicStartDuration?: {
        durationPeriodUnit: PeriodUnit;
        distribution: Distribution;
    };
    maxEntities?: number;
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

        // Create generator using stored data or defaults
        const generator = new Generator(
            this.platformElementId,
            storedData?.name || 'New Generator',
            storedData?.activityKeyId || '',
            storedData?.entityId || ModelDefaults.DEFAULT_ENTITY_ID,
            storedData?.periodicOccurrences ?? Infinity,
            storedData?.periodIntervalDuration 
                ? new Duration(
                    storedData.periodIntervalDuration.durationPeriodUnit, 
                    storedData.periodIntervalDuration.distribution
                ) 
                : new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)),
            storedData?.entitiesPerCreation ?? 1,
            storedData?.periodicStartDuration
                ? new Duration(
                    storedData.periodicStartDuration.durationPeriodUnit, 
                    storedData.periodicStartDuration.distribution
                )
                : new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)),
            storedData?.maxEntities ?? Infinity,
            storedData?.x ?? 0,
            storedData?.y ?? 0
        );

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(generator);

        return generator;
    }

    private updatePlatformSpecificFields(generator: Generator): void {
        const block = this.element as BlockProxy;
        
        // Update location from current platform
        const location = block.getLocation();
        generator.setLocation(location.x ?? generator.x, location.y ?? generator.y);

        // Update name if needed
        if (!generator.name || generator.name === 'New Generator') {
            generator.name = this.getElementName('Generator');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            x: generator.x,
            y: generator.y,
            name: generator.name
        });
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Generator from platform for element ID: ${this.platformElementId}`);
        
        // Extract location from platform
        const location = (this.element as BlockProxy).getLocation();
        
        // Update location
        this.simObject.setLocation(
            location.x ?? this.simObject.x, 
            location.y ?? this.simObject.y
        );

        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Generator');
        }

        // Store updated data
        const dataToStore: StoredGeneratorData = {
            id: this.platformElementId,
            x: this.simObject.x,     // Store x coordinate
            y: this.simObject.y,     // Store y coordinate
            name: this.simObject.name,
            activityKeyId: this.simObject.activityKeyId,
            entityId: this.simObject.entityId,
            periodicOccurrences: this.simObject.periodicOccurrences,
            periodIntervalDuration: {
                durationPeriodUnit: this.simObject.periodIntervalDuration.durationPeriodUnit,
                distribution: this.simObject.periodIntervalDuration.distribution
            },
            entitiesPerCreation: this.simObject.entitiesPerCreation,
            periodicStartDuration: {
                durationPeriodUnit: this.simObject.periodicStartDuration.durationPeriodUnit,
                distribution: this.simObject.periodicStartDuration.distribution
            },
            maxEntities: this.simObject.maxEntities
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

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter): GeneratorLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating GeneratorLucid from conversion for block ID: ${block.id}`);
        
        // Extract location
        const location = block.getLocation();
        
        // Create default generator using the static method with location
        const defaultGenerator = Generator.createDefault(
            block.id, 
            location.x ?? 0, 
            location.y ?? 0
        );
        
        const name = SimObjectLucid.getNameFromBlock(block, 'Generator');

        // Convert to StoredGeneratorData format
        const storedData: StoredGeneratorData = {
            id: defaultGenerator.id,
            name: name,
            x: defaultGenerator.x,  // Include x coordinate
            y: defaultGenerator.y,  // Include y coordinate
            activityKeyId: defaultGenerator.activityKeyId,
            entityId: defaultGenerator.entityId,
            periodicOccurrences: defaultGenerator.periodicOccurrences,
            periodIntervalDuration: {
                durationPeriodUnit: defaultGenerator.periodIntervalDuration.durationPeriodUnit,
                distribution: defaultGenerator.periodIntervalDuration.distribution
            },
            entitiesPerCreation: defaultGenerator.entitiesPerCreation,
            periodicStartDuration: {
                durationPeriodUnit: defaultGenerator.periodicStartDuration.durationPeriodUnit,
                distribution: defaultGenerator.periodicStartDuration.distribution
            },
            maxEntities: defaultGenerator.maxEntities
        };

        ComponentLogger.log(LOG_PREFIX, `Setting initial data for converted generator, block ID: ${block.id}`, storedData);
        
        // Set up both data and metadata using setElementData
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.Generator,
            {
                version: "1.0.0"
            }
        );

        // Now create the GeneratorLucid instance
        return new GeneratorLucid(block, storageAdapter);
    }
}