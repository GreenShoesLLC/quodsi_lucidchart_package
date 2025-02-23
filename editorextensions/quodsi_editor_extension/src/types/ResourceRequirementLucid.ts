import { BlockProxy } from 'lucid-extension-sdk';
import { 
    ResourceRequirement,
    RequirementClause,
    SimulationObjectType,
    Resource
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';

/**
 * Lucid-specific implementation of a ResourceRequirement.
 * Maps a Lucid Block element to a simulation ResourceRequirement.
 */
export class ResourceRequirementLucid extends SimObjectLucid<ResourceRequirement> {
    private block: BlockProxy;

    constructor(block: BlockProxy, storageAdapter: StorageAdapter) {
        super(block, storageAdapter);
        this.block = block;
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.ResourceRequirement;
    }

    protected createSimObject(): ResourceRequirement {
        // Unlike other types, ResourceRequirement doesn't have a createDefault.
        // Instead, we create a basic requirement with an empty clause array.
        return new ResourceRequirement(
            this.block.id,
            this.getElementName('Resource Requirement'),
            [] // empty root clauses
        );
    }

    /**
     * Creates a ResourceRequirement from a specific Resource
     */
    public static createFromResource(
        block: BlockProxy, 
        storageAdapter: StorageAdapter,
        resource: Resource
    ): ResourceRequirementLucid {
        const instance = new ResourceRequirementLucid(block, storageAdapter);
        instance.simObject = ResourceRequirement.createForSingleResource(resource);
        return instance;
    }

    public updateFromPlatform(): void {
        // Update name
        this.simObject.name = this.getElementName('Resource Requirement');

        // Note: Resource requirement clauses and requests are typically 
        // updated through user interactions in the panel rather than 
        // from changes to the Lucid block itself

        // Store updated data
        this.storageAdapter.updateElementData(this.block, this.simObject);
    }

    protected getElementName(defaultPrefix: string): string {
        // Check for text areas on the block
        if (this.block.textAreas && this.block.textAreas.size > 0) {
            for (const text of this.block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        // If no text found, use class name
        const className = this.block.getClassName() || 'Block';
        return `${defaultPrefix} ${className}`;
    }

    /**
     * Additional method to add a clause to the requirement
     */
    public addClause(clause: RequirementClause): void {
        this.simObject.addClause(clause);
        this.storageAdapter.updateElementData(this.block, this.simObject);
    }

    /**
     * Additional method to remove a clause from the requirement
     */
    public removeClause(clauseId: string): void {
        this.simObject.removeClause(clauseId);
        this.storageAdapter.updateElementData(this.block, this.simObject);
    }
}