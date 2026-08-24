import { BlockProxy, ElementProxy } from 'lucid-extension-sdk';
import {
    PlatformSimObject,
    PlatformType,
    PlatformMetadata,
    SimulationObject,
    SimulationObjectType,
    ComponentLogger,
    MODEL_SCHEMA_VERSION,
    pickName
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../core/StorageAdapter';
import { blockToNameable } from './nameableShape';

// Define a constant for the logger prefix
const LOG_PREFIX = '[SimObjectLucid]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Enable or disable logging for SimObjectLucid and its subclasses
 */
export const setSimObjectLucidLogging = (enabled: boolean): void => {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

/**
 * Base abstract class for Lucid-specific simulation objects.
 * Implements common functionality and enforces the PlatformSimObject contract.
 */
export abstract class SimObjectLucid<T extends SimulationObject> implements PlatformSimObject<T> {
    protected simObject: T;

    constructor(
        protected element: ElementProxy,
        protected storageAdapter: StorageAdapter
    ) {
        ComponentLogger.log(LOG_PREFIX, `Constructing ${this.constructor.name} for element ID: ${element.id}`);
        this.simObject = this.createSimObject();
    }

    /**
     * Gets the unique identifier of the Lucid element
     */
    get platformElementId(): string {
        return this.element.id;
    }

    /**
     * Gets the simulation object type - implemented by derived classes
     */
    abstract get type(): SimulationObjectType;

    /**
     * Creates the initial simulation object - implemented by derived classes
     */
    protected abstract createSimObject(): T;

    /**
     * abstract static method for conversion
     */
    static createFromConversion(
        element: ElementProxy,
        storageAdapter: StorageAdapter
    ): SimObjectLucid<SimulationObject> {
        ComponentLogger.log(LOG_PREFIX, `createFromConversion called for element ID: ${element.id}`);
        throw new Error('createFromConversion must be implemented by subclass');
    }

    /**
     * Gets the element name - implemented by derived classes since
     * different element types (Block, Line) handle text differently
     */
    protected abstract getElementName(defaultPrefix: string): string;

    /**
     * Gets the platform-agnostic simulation object
     */
    public getSimulationObject(): T {
        return this.simObject;
    }

    /**
     * Updates the simulation object from the Lucid element - implemented by derived classes
     */
    public abstract updateFromPlatform(): void;

    /**
     * Validates the Lucid element storage
     */
    public validate(): boolean {
        const isValid = this.storageAdapter.validateStorage(this.element);
        ComponentLogger.log(LOG_PREFIX, `Validation for element ID ${this.element.id}: ${isValid}`);
        return isValid;
    }

    /**
     * Gets Lucid-specific metadata
     */
    public getMetadata(): PlatformMetadata {
        const metadata = {
            platform: PlatformType.Lucid,
            version: MODEL_SCHEMA_VERSION,
            lastModified: new Date().toISOString(),
            elementId: this.element.id,
            elementType: this.type
        };
        ComponentLogger.log(LOG_PREFIX, `Getting metadata for element ID ${this.element.id}`, metadata);
        return metadata;
    }
    
    /**
     * Name a block being converted, using the SHARED policy (@quodsi/shared
     * conversion/naming) that drawio and Visio run — canvas text, then the
     * block class for the types where it means something, then a unique
     * "<TypeLabel> <sequence|id>" fallback.
     *
     * Replaces a Lucid-only chain of "text, else '<prefix> <className>'".
     * That fallback was IDENTICAL for every unnamed block of a type ("Act
     * ProcessBlock" twice over), so duplicates were the normal case and only
     * de-duplication cleaned up after it. See ClickUp 86e233g6f.
     *
     * `sequence` (1-based) makes the fallback read as "Activity 1" rather than
     * carrying Lucid's long opaque block id; conversion supplies it from the
     * count of same-type elements named so far.
     */
    protected static pickBlockName(
        block: BlockProxy,
        opts: { typeLabel: string; includeMasterName: boolean; sequence?: number }
    ): string {
        const name = pickName(blockToNameable(block), opts);
        ComponentLogger.log(LOG_PREFIX, `Generated name for element ID ${block.id}: ${name}`);
        return name;
    }

    /**
     * The block's visible canvas text, or '' when it has none.
     *
     * This is `pickBlockName`'s FIRST step and nothing more: no type-label
     * and no sequence fallback, because callers here want "what the user
     * typed on this shape" as a display hint, not a name to store. Reads
     * through the same `blockToNameable` adapter the naming policy uses, so
     * the two never disagree about which text area counts.
     */
    public static blockLabel(block: BlockProxy): string {
        return blockToNameable(block).text ?? '';
    }

    /**
     * Static utility method to update a block's displayed text
     * Used to clean up structured names after parsing (e.g., "name: Triage | duration: 5" -> "Triage")
     */
    static updateBlockText(block: BlockProxy, newText: string): void {
        if (block.textAreas && block.textAreas.size > 0) {
            const firstKey = Array.from(block.textAreas.keys())[0];
            block.textAreas.set(firstKey, newText);
            ComponentLogger.log(LOG_PREFIX, `Updated block ${block.id} text to: ${newText}`);
        }
    }
}