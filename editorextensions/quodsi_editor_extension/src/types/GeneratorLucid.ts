import { BlockProxy } from 'lucid-extension-sdk';
import { 
    ConstantDistribution,
    Distribution,
    Duration,
    DurationType,
    Generator,
    ModelDefaults,
    PeriodUnit,
    SimulationObjectType 
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';


interface StoredGeneratorData {
    id: string;
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
        // Pass the block as the element to the parent constructor
        super(block, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Generator;
    }

    protected createSimObject(): Generator {
        // Create generator with element-specific properties
        const generator = new Generator(
            this.platformElementId,
            this.getElementName('Generator'),
            "", // default activityKeyId
            ModelDefaults.DEFAULT_ENTITY_ID,
            Infinity, // default periodicOccurrences
            new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)), // default periodIntervalDuration
            1, // default entitiesPerCreation
            new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)), // default periodicStartDuration
            Infinity // default maxEntities
        );

        // Get stored custom data
        const storedData = this.storageAdapter.getElementData(this.element) as StoredGeneratorData;

        if (storedData) {
            // Copy specific properties from stored data
            generator.activityKeyId = storedData.activityKeyId ?? "";
            generator.entityId = storedData.entityId ?? ModelDefaults.DEFAULT_ENTITY_ID;
            generator.periodicOccurrences = storedData.periodicOccurrences ?? Infinity;
            generator.entitiesPerCreation = storedData.entitiesPerCreation ?? 1;
            generator.maxEntities = storedData.maxEntities ?? Infinity;

            // Handle Duration objects
            if (storedData.periodIntervalDuration) {
                generator.periodIntervalDuration = new Duration(
                    storedData.periodIntervalDuration.durationPeriodUnit,
                    storedData.periodIntervalDuration.distribution
                );
            }

            if (storedData.periodicStartDuration) {
                generator.periodicStartDuration = new Duration(
                    storedData.periodicStartDuration.durationPeriodUnit,
                    storedData.periodicStartDuration.distribution
                );
            }
        }

        return generator;
    }

    public updateFromPlatform(): void {
        // Update element-specific properties
        this.simObject.name = this.getElementName('Generator');

        // Store only custom data properties
        const dataToStore = {
            id: this.platformElementId,
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

        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        const block = this.element as BlockProxy;

        // Check for text areas on the block
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        // If no text found, use class name
        const className = block.getClassName() || 'Block';
        return `${defaultPrefix} ${className}`;
    }

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter): GeneratorLucid {
        // Create default generator using the static method
        const defaultGenerator = Generator.createDefault(block.id);

        // Convert to StoredGeneratorData format
        const storedData: StoredGeneratorData = {
            id: defaultGenerator.id,
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

        // Set up both data and metadata
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.Generator,
            {
                version: "1.0.0"
            }
        );

        // Create and return the GeneratorLucid instance
        return new GeneratorLucid(block, storageAdapter);
    }
}