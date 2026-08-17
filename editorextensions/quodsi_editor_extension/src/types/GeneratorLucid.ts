import { BlockProxy } from 'lucid-extension-sdk';
import {
    Duration,
    ConstantDistribution,
    Generator,
    ModelDefaults,
    PeriodUnit,
    SimulationObjectType,
    ComponentLogger,
    StateModification,
    parseStructuredName,
    extractGeneratorFields,
    GeneratorType,
    ConnectType,
    MappingSource,
    ScenarioLever
} from '@quodsi/lucid-shared';
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

/**
 * Wire-cleanup Phase B2 Task 9: `EntitySourceConfig` was dissolved (Task 5) —
 * the generator-core fields (`entityId`/`mode`/`interarrivalTime`/
 * `batchSize`/`startDelay`/`maxCycles`/`arrivalPatternId`/`volume`/
 * `arrivalScheduleId`/`maxEntities`/`initialStates`) now live FLAT on
 * `Generator` itself, matching the clean wire — this storage shape follows
 * suit (previously a nested `generationConfig` object). Lucid's stored
 * `q_data` shapes go through the same `upgradeElements()` version-upgrade
 * pipeline as the model_definition wire (see `LucidVersionUpgrader.ts`),
 * so an old document's nested `generationConfig` shape is migrated to this
 * flat shape on open, same as the exported model.json is.
 */
interface StoredGeneratorData {
    id: string;
    name?: string;
    description?: string;
    x?: number;
    y?: number;
    // Optional shape dimensions in SVG userSpace (Path X-lite).
    width?: number;
    height?: number;
    entityId?: string;
    mode?: GeneratorType;
    interarrivalTime?: Duration;
    batchSize?: number;
    startDelay?: Duration;
    maxCycles?: number;
    arrivalPatternId?: string;
    volume?: number;
    arrivalScheduleId?: string;
    maxEntities?: number;
    initialStates?: StateModification[];
    routing?: ConnectType;
    levers?: ScenarioLever[];
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

        const entityId = storedData?.entityId ?? ModelDefaults.DEFAULT_ENTITY_ID;
        const interarrivalTime = storedData?.interarrivalTime
            ?? Duration.fromDistribution(PeriodUnit.HOURS, ConstantDistribution.create(1));

        // Create generator with new constructor
        const generator = new Generator(
            this.platformElementId,
            storedData?.name || 'New Generator',
            entityId,
            interarrivalTime,
            storedData?.x ?? 0,
            storedData?.y ?? 0
        );

        generator.mode = storedData?.mode ?? GeneratorType.FREQUENCY;
        generator.batchSize = storedData?.batchSize;
        generator.startDelay = storedData?.startDelay;
        // Smoke-finding SF-1(b): honest absence stays absent. This used to
        // default `?? 999999`, manufacturing an explicit legacy-sentinel
        // value on the in-memory record even when storage genuinely omitted
        // the field — which then leaked onto the wire as
        // `"maxCycles": 999999, "maxEntities": 999999` (the shared-layer
        // `Generator.toJSON()` fix, SF-1(a), now collapses the sentinel if
        // it DOES show up, but the record itself should never invent one).
        // A display default belongs at the DISPLAY layer — see
        // `GeneratorEditor.tsx`'s own `INFINITY_DISPLAY_VALUE` fallback,
        // which already does this independently for the panel's UI.
        generator.maxCycles = storedData?.maxCycles;
        generator.arrivalPatternId = storedData?.arrivalPatternId;
        generator.volume = storedData?.volume;
        generator.arrivalScheduleId = storedData?.arrivalScheduleId;
        generator.maxEntities = storedData?.maxEntities;
        generator.routing = storedData?.routing ?? ConnectType.Probability;

        // Restore description
        if (storedData?.description !== undefined) {
            generator.description = storedData.description;
        }

        // Deserialize initial state modifications if stored as JSON
        if (storedData?.initialStates) {
            generator.initialStates = storedData.initialStates.map(
                (mod: any) => mod instanceof StateModification ? mod : StateModification.fromJSON(mod)
            );
        }

        // Carry forward scenario-lever authoring metadata. `levers` is a class
        // field (not a constructor param) defaulting to [], so reconstruction
        // drops it unless copied here -> published model.json loses levers.
        if (storedData?.levers) {
            generator.levers = storedData.levers;
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

        // Store updated data. Every generator-core field carried through
        // regardless of mode: a generator authored as PATTERN elsewhere
        // (Studio, drawio) carries arrivalPatternId/volume that Lucid has no
        // editor for (see GeneratorEditor.tsx) but must not silently drop on
        // a routine platform write-back (e.g. dragging the shape).
        const dataToStore: StoredGeneratorData = {
            id: this.platformElementId,
            name: this.simObject.name,
            description: this.simObject.description,
            x: this.simObject.x,
            y: this.simObject.y,
            width: this.simObject.width,
            height: this.simObject.height,
            entityId: this.simObject.entityId,
            mode: this.simObject.mode,
            interarrivalTime: this.simObject.interarrivalTime,
            batchSize: this.simObject.batchSize,
            startDelay: this.simObject.startDelay,
            maxCycles: this.simObject.maxCycles,
            arrivalPatternId: this.simObject.arrivalPatternId,
            volume: this.simObject.volume,
            arrivalScheduleId: this.simObject.arrivalScheduleId,
            maxEntities: this.simObject.maxEntities,
            initialStates: this.simObject.initialStates?.map(
                m => (m instanceof StateModification ? (m.toJSON() as unknown as StateModification) : m)
            ),
            routing: this.simObject.routing,
            // Levers survive the write-back (conditional — see ActivityLucid).
            levers: this.simObject.levers?.length ? this.simObject.levers : undefined
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

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource, nameSequence?: number): GeneratorLucid {
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
        const rawName = SimObjectLucid.pickBlockName(block, {
            typeLabel: 'Generator',
            includeMasterName: true,
            sequence: nameSequence,
        });
        const parsed = parseStructuredName(rawName);
        const fields = extractGeneratorFields(parsed);

        ComponentLogger.log(LOG_PREFIX, `Parsed structured name for block ${block.id}:`, { rawName, fields });

        // Update shape text to clean name if we parsed structured data
        if (rawName.includes('|') && fields.name) {
            SimObjectLucid.updateBlockText(block, fields.name);
        }

        // Convert to StoredGeneratorData format, using parsed values where available
        const storedData: StoredGeneratorData = {
            id: defaultGenerator.id,
            name: fields.name || rawName,
            x: defaultGenerator.x,
            y: defaultGenerator.y,
            width: defaultGenerator.width,
            height: defaultGenerator.height,
            entityId: defaultGenerator.entityId,
            mode: GeneratorType.FREQUENCY,
            interarrivalTime: fields.interval !== undefined
                ? Duration.fromDistribution(PeriodUnit.MINUTES, ConstantDistribution.create(fields.interval))
                : defaultGenerator.interarrivalTime,
            batchSize: fields.entitiesPerCreation ?? 1,
            startDelay: Duration.constant(0, PeriodUnit.HOURS),
            maxCycles: fields.periodicOccurrences ?? 999999,
            maxEntities: fields.maxEntities ?? 999999,
            initialStates: []
        };

        if (fields.interval !== undefined) {
            ComponentLogger.log(LOG_PREFIX, `Using parsed interval: ${fields.interval} minutes`);
        }

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
