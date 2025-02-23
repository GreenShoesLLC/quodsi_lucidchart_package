import { ElementProxy } from 'lucid-extension-sdk';
import { 
    PlatformSimObject, 
    PlatformType,
    PlatformMetadata,
    SimulationObject,
    SimulationObjectType 
} from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';

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
        return this.storageAdapter.validateStorage(this.element);
    }

    /**
     * Gets Lucid-specific metadata
     */
    public getMetadata(): PlatformMetadata {
        return {
            platform: PlatformType.Lucid,
            version: '1.0.0',
            lastModified: new Date().toISOString(),
            elementId: this.element.id,
            elementType: this.type
        };
    }
}