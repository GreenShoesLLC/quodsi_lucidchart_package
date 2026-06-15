import { LineProxy, BlockProxy } from 'lucid-extension-sdk';
import {
    Connector,
    SimulationObjectType,
    ComponentLogger,
    StateCondition,
    StateModification,
    MappingSource,
    ScenarioLever
} from '@quodsi/lucid-shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';

// Define a constant for the logger prefix
const LOG_PREFIX = '[ConnectorLucid]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Enable or disable logging for ConnectorLucid
 */
export const setConnectorLucidLogging = (enabled: boolean): void => {
    ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

interface StoredConnectorData {
    id: string;
    sourceX?: number;
    sourceY?: number;
    targetX?: number;
    targetY?: number;
    x?: number;
    y?: number;
    name?: string;
    description?: string;
    sourceId?: string;
    targetId?: string;
    weight?: number;
    entityTemplateUniqueId?: string;
    stateCondition?: any;
    stateModifications?: any[];
    levers?: ScenarioLever[];
}

/**
 * Lucid-specific implementation of a Connector.
 * Maps a Lucid Line element to a simulation Connector.
 */
export class ConnectorLucid extends SimObjectLucid<Connector> {
    constructor(line: LineProxy, storageAdapter: StorageAdapter) {
        ComponentLogger.log(LOG_PREFIX, `Constructing ConnectorLucid for line ID: ${line.id}`);
        super(line, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Connector;
    }

    protected createSimObject(): Connector {
        ComponentLogger.log(LOG_PREFIX, `Creating Connector simulation object for element ID: ${this.platformElementId}`);

        // Get stored custom data first
        const storedData = this.storageAdapter.getElementData(this.element) as StoredConnectorData;

        // Get line endpoints
        const line = this.element as LineProxy;
        const endpoint1 = line.getEndpoint1();
        const endpoint2 = line.getEndpoint2();

        // Create connector using stored data or defaults
        const connector = new Connector(
            this.platformElementId,
            storedData?.name || this.getElementName('Connector'),
            storedData?.sourceId || endpoint1.connection?.id || '',
            storedData?.targetId || endpoint2.connection?.id || '',
            storedData?.weight ?? 1,
            storedData?.sourceX ?? endpoint1.x ?? 0,
            storedData?.sourceY ?? endpoint1.y ?? 0,
            storedData?.targetX ?? endpoint2.x ?? 0,
            storedData?.targetY ?? endpoint2.y ?? 0,
            storedData?.x ?? (endpoint1.x + endpoint2.x) / 2,
            storedData?.y ?? (endpoint1.y + endpoint2.y) / 2
        );

        // Restore description
        if (storedData?.description !== undefined) {
            connector.description = storedData.description;
        }

        // Deserialize state condition
        if (storedData?.stateCondition) {
            connector.stateCondition = StateCondition.fromJSON(storedData.stateCondition);
        }

        // Deserialize state modifications
        if (storedData?.stateModifications) {
            connector.stateModifications = storedData.stateModifications.map(
                (data: any) => StateModification.fromJSON(data)
            );
        }

        // Restore entity template unique ID
        if (storedData?.entityTemplateUniqueId) {
            connector.entityTemplateUniqueId = storedData.entityTemplateUniqueId;
        }

        // Carry forward scenario-lever authoring metadata. `levers` is a class
        // field (not a constructor param) defaulting to [], so reconstruction
        // drops it unless copied here -> published model.json loses levers.
        if (storedData?.levers) {
            connector.levers = storedData.levers;
        }

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(connector);

        return connector;
    }

    private updatePlatformSpecificFields(connector: Connector): void {
        const line = this.element as LineProxy;
        const endpoint1 = line.getEndpoint1();
        const endpoint2 = line.getEndpoint2();

        // Update source and target locations
        connector.setSourceLocation(endpoint1.x, endpoint1.y);
        connector.setTargetLocation(endpoint2.x, endpoint2.y);

        // Update name if needed
        if (!connector.name || connector.name === 'New Connector') {
            connector.name = this.getElementName('Connector');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            sourceX: connector.sourceX,
            sourceY: connector.sourceY,
            targetX: connector.targetX,
            targetY: connector.targetY,
            name: connector.name
        });
    }

    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating Connector from platform for element ID: ${this.platformElementId}`);

        // Get line endpoints
        const line = this.element as LineProxy;
        const endpoint1 = line.getEndpoint1();
        const endpoint2 = line.getEndpoint2();

        // Update source and target locations
        this.simObject.setSourceLocation(endpoint1.x, endpoint1.y);
        this.simObject.setTargetLocation(endpoint2.x, endpoint2.y);

        // Update name if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName('Connector');
        }

        // Store updated data
        const dataToStore: StoredConnectorData = {
            id: this.platformElementId,
            sourceX: this.simObject.sourceX,
            sourceY: this.simObject.sourceY,
            targetX: this.simObject.targetX,
            targetY: this.simObject.targetY,
            x: this.simObject.x,
            y: this.simObject.y,
            name: this.simObject.name,
            description: this.simObject.description,
            sourceId: this.simObject.sourceId,
            targetId: this.simObject.targetId,
            weight: this.simObject.weight,
            entityTemplateUniqueId: this.simObject.entityTemplateUniqueId,
            stateCondition: this.simObject.stateCondition?.toJSON(),
            stateModifications: this.simObject.stateModifications.map(m => m.toJSON())
        };

        ComponentLogger.log(LOG_PREFIX, `Storing updated data for element ID: ${this.platformElementId}`, dataToStore);
        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        const line = this.element as LineProxy;

        // Check for text areas on the line
        for (const [, text] of line.textAreas) {
            if (text && text.trim()) {
                const name = text.trim();
                ComponentLogger.log(LOG_PREFIX, `Using text area content as name for line ID ${line.id}: ${name}`);
                return name;
            }
        }

        // If no text found, generate a name based on endpoints
        const sourceName = this.getEndpointName(line.getEndpoint1().connection?.id);
        const targetName = this.getEndpointName(line.getEndpoint2().connection?.id);

        if (sourceName && targetName) {
            const name = `${sourceName} → ${targetName}`;
            ComponentLogger.log(LOG_PREFIX, `Created name from endpoints for line ID ${line.id}: ${name}`);
            return name;
        }

        const name = `${defaultPrefix} ${line.id}`;
        ComponentLogger.log(LOG_PREFIX, `Using default name for line ID ${line.id}: ${name}`);
        return name;
    }

    private getBlockName(block: BlockProxy): string {
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        const className = block.getClassName() || 'Block';
        return `New ${className}`;
    }

    private getEndpointName(elementId: string | undefined): string | undefined {
        const line = this.element as LineProxy;
        if (!elementId) return undefined;

        const block = line.getPage().allBlocks.get(elementId);
        if (!block) return undefined;

        return this.getBlockName(block);
    }

    static createFromConversion(line: LineProxy, storageAdapter: StorageAdapter, mappingSource?: MappingSource): ConnectorLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating ConnectorLucid from conversion for line ID: ${line.id}, mappingSource: ${mappingSource}`);

        // Get line endpoints
        const endpoint1 = line.getEndpoint1();
        const endpoint2 = line.getEndpoint2();

        // Create default connector with detailed location
        const defaultConnector = Connector.createDefault(
            line.id,
            endpoint1.x,
            endpoint1.y,
            endpoint2.x,
            endpoint2.y
        );

        // Safely get endpoints with null checks
        if (endpoint1 && endpoint1.connection) {
            defaultConnector.sourceId = endpoint1.connection.id;
            ComponentLogger.log(LOG_PREFIX, `Setting source ID for line ${line.id}: ${endpoint1.connection.id}`);
        }

        if (endpoint2 && endpoint2.connection) {
            defaultConnector.targetId = endpoint2.connection.id;
            ComponentLogger.log(LOG_PREFIX, `Setting target ID for line ${line.id}: ${endpoint2.connection.id}`);
        }

        // Custom name using endpoints if available
        let name = `Connector ${line.id}`;
        if (defaultConnector.sourceId && defaultConnector.targetId) {
            // Try to get block names from page
            const page = line.getPage();
            const sourceBlock = page.allBlocks.get(defaultConnector.sourceId);
            const targetBlock = page.allBlocks.get(defaultConnector.targetId);

            const sourceName = sourceBlock ? this.getNameFromBlock(sourceBlock, 'Source') : 'Source';
            const targetName = targetBlock ? this.getNameFromBlock(targetBlock, 'Target') : 'Target';

            name = `${sourceName} → ${targetName}`;
            ComponentLogger.log(LOG_PREFIX, `Generated name for connector from endpoint names: ${name}`);
        }
        defaultConnector.name = name;

        // Convert to StoredConnectorData format
        const storedData: StoredConnectorData = {
            id: defaultConnector.id,
            sourceX: defaultConnector.sourceX,   // Include source x coordinate
            sourceY: defaultConnector.sourceY,   // Include source y coordinate
            targetX: defaultConnector.targetX,   // Include target x coordinate
            targetY: defaultConnector.targetY,   // Include target y coordinate
            x: defaultConnector.x,               // Include midpoint x
            y: defaultConnector.y,               // Include midpoint y
            name: defaultConnector.name,
            sourceId: defaultConnector.sourceId,
            targetId: defaultConnector.targetId,
            weight: defaultConnector.weight,
            entityTemplateUniqueId: defaultConnector.entityTemplateUniqueId,
            stateCondition: defaultConnector.stateCondition?.toJSON(),
            stateModifications: defaultConnector.stateModifications.map(m => m.toJSON())
        };

        ComponentLogger.log(LOG_PREFIX, `Setting element data for connector ID: ${line.id}`, storedData);

        // Set up element data (type + component data merged into single q_data)
        storageAdapter.setElementData(
            line,
            storedData,
            SimulationObjectType.Connector,
            {
                mappingSource: mappingSource
            }
        );

        // Create and return the ConnectorLucid instance
        return new ConnectorLucid(line, storageAdapter);
    }
}