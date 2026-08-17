import { BlockProxy } from 'lucid-extension-sdk';
import {
    ResourceRequirement,
    RequirementClause,
    RequirementMode,
    SimulationObjectType,
    Resource,
    MappingSource
} from '@quodsi/lucid-shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';

interface StoredResourceRequirementData {
    id: string;
    name: string;
    rootClause: RequirementClause;
}

/**
 * Wire-cleanup Phase B2 Task 6/9: `ResourceRequirement`'s `rootClauses[]`
 * array collapsed to a single required `rootClause` — the "exactly one root
 * clause" rule is now structural, not a semantic validator check.
 * `addClause`/`removeClause` (array mutators) were retired along with the
 * array; a freshly scaffolded requirement now always carries a real (empty)
 * root clause rather than an empty array.
 */
function emptyRootClause(): RequirementClause {
    return new RequirementClause('clause-1', RequirementMode.REQUIRE_ALL, [], []);
}

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
        // Instead, we create a basic requirement with an empty root clause.
        return new ResourceRequirement(
            this.block.id,
            this.getElementName('Resource Requirement'),
            emptyRootClause()
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
     * Additional method to add a sub-clause to the requirement's root clause.
     */
    public addClause(clause: RequirementClause): void {
        this.simObject.rootClause.addSubClause(clause);
        this.storageAdapter.updateElementData(this.block, this.simObject);
    }

    /**
     * Additional method to remove a sub-clause (by id) from the requirement's
     * root clause.
     */
    public removeClause(clauseId: string): void {
        this.simObject.rootClause.clauses = this.simObject.rootClause.clauses.filter(
            (c) => c.id !== clauseId
        );
        this.storageAdapter.updateElementData(this.block, this.simObject);
    }

    static createFromConversion(block: BlockProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource): ResourceRequirementLucid {
        // Create default resource requirement
        // Note: ResourceRequirement doesn't have a createDefault method
        const defaultRequirement = new ResourceRequirement(
            block.id,
            `Resource Requirement ${block.getClassName() || 'Block'}`,
            emptyRootClause()
        );

        // Convert to StoredResourceRequirementData format
        const storedData: StoredResourceRequirementData = {
            id: defaultRequirement.id,
            name: defaultRequirement.name,
            rootClause: defaultRequirement.rootClause
        };

        // Set up both data and metadata
        storageAdapter.setElementData(
            block,
            storedData,
            SimulationObjectType.ResourceRequirement,
            {
                version: "1.0.0",
                mappingSource: mappingSource
            }
        );

        // Create and return the ResourceRequirementLucid instance
        return new ResourceRequirementLucid(block, storageAdapter);
    }
}
