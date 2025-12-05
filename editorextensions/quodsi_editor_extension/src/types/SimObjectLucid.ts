import { BlockProxy, ElementProxy } from 'lucid-extension-sdk';
import { 
    PlatformSimObject, 
    PlatformType,
    PlatformMetadata,
    SimulationObject,
    SimulationObjectType,
    ComponentLogger
} from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';

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
            version: '1.0.0',
            lastModified: new Date().toISOString(),
            elementId: this.element.id,
            elementType: this.type
        };
        ComponentLogger.log(LOG_PREFIX, `Getting metadata for element ID ${this.element.id}`, metadata);
        return metadata;
    }
    
    /**
     * Static utility method to get name from a block's text areas
     */
    protected static getNameFromBlock(block: BlockProxy, defaultPrefix: string): string {
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        const className = block.getClassName() || 'Block';
        const name = `${defaultPrefix} ${className}`;
        ComponentLogger.log(LOG_PREFIX, `Generated name for element ID ${block.id}: ${name}`);
        return name;
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