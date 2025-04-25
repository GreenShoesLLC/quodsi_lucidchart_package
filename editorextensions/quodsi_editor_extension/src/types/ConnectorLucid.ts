import { LineProxy, BlockProxy } from 'lucid-extension-sdk';
import { 
    Connector,
    ConnectType,
    OperationStep,
    SimulationObjectType,
    ComponentLogger
} from '@quodsi/shared';
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
    probability?: number;
    connectType?: ConnectType;
    operationSteps?: OperationStep[];
}
/**
 * Lucid-specific implementation of a Connector.
 * Maps a Lucid Line element to a simulation Connector.
 */
export class ConnectorLucid extends SimObjectLucid<Connector> {
    // private line: LineProxy;

    constructor(line: LineProxy, storageAdapter: StorageAdapter) {
        ComponentLogger.log(LOG_PREFIX, `Constructing ConnectorLucid for line ID: ${line.id}`);
        super(line, storageAdapter);
        // this.line = line;
        // Reinitialize the simulation object using the correctly set `this.line`.
        // this.simObject = this.createSimObject();
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Connector;
    }

    protected createSimObject(): Connector {
        const line = this.element as LineProxy;
        ComponentLogger.log(LOG_PREFIX, `Creating simulation object for line ${line.id} endpoints:`, {
            endpoint1: {
                connectionId: line.getEndpoint1().connection?.id,
                position: { x: line.getEndpoint1().x, y: line.getEndpoint1().y }
            },
            endpoint2: {
                connectionId: line.getEndpoint2().connection?.id,
                position: { x: line.getEndpoint2().x, y: line.getEndpoint2().y }
            }
        });
        
        // Create connector with element-specific properties
        const connector = new Connector(
            this.platformElementId,                     // id
            this.getElementName('Connector'),           // name
            line.getEndpoint1().connection?.id || '',   // sourceId
            line.getEndpoint2().connection?.id || '',   // targetId
            1.0,                                        // probability
            ConnectType.Probability,                    // connectType
            []  // default operationSteps
        );

        // Get stored custom data
        const storedData = this.storageAdapter.getElementData(this.element) as StoredConnectorData;

        if (storedData) {
            ComponentLogger.log(LOG_PREFIX, `Found stored data for connector ID: ${this.platformElementId}`, storedData);
            // Only copy specific properties we want from stored data
            connector.probability = storedData.probability ?? 1.0;
            connector.connectType = storedData.connectType ?? ConnectType.Probability;
            connector.operationSteps = storedData.operationSteps || [];
        } else {
            ComponentLogger.log(LOG_PREFIX, `No stored data found for connector ID: ${this.platformElementId}, using defaults`);
        }

        return connector;
    }


    public updateFromPlatform(): void {
        ComponentLogger.log(LOG_PREFIX, `Updating from platform for connector ID: ${this.platformElementId}`);
        const line = this.element as LineProxy;

        // Update element-specific properties
        this.simObject.name = this.getElementName('Connector');
        this.simObject.sourceId = line.getEndpoint1().connection?.id || '';
        this.simObject.targetId = line.getEndpoint2().connection?.id || '';

        // Store only custom data properties
        const dataToStore = {
            id: this.platformElementId,
            probability: this.simObject.probability,
            connectType: this.simObject.connectType,
            operationSteps: this.simObject.operationSteps
        };

        ComponentLogger.log(LOG_PREFIX, `Storing updated data for connector ID: ${this.platformElementId}`, dataToStore);
        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        // Check for text areas on the line
        const line = this.element as LineProxy;
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

    static createFromConversion(line: LineProxy, storageAdapter: StorageAdapter): ConnectorLucid {
        ComponentLogger.log(LOG_PREFIX, `Creating ConnectorLucid from conversion for line ID: ${line.id}`);
        
        // Create default connector using the static method
        const defaultConnector = Connector.createDefault(line.id);

        // Safely get endpoints with null checks
        const endpoint1 = line.getEndpoint1();
        const endpoint2 = line.getEndpoint2();

        // Set source and target IDs if connections exist
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

            const sourceName = sourceBlock ? ConnectorLucid.getNameFromBlock(sourceBlock, 'Source') : 'Source';
            const targetName = targetBlock ? ConnectorLucid.getNameFromBlock(targetBlock, 'Target') : 'Target';

            name = `${sourceName} → ${targetName}`;
            ComponentLogger.log(LOG_PREFIX, `Generated name for connector from endpoint names: ${name}`);
        }
        defaultConnector.name = name;

        // Convert to StoredConnectorData format
        const storedData: StoredConnectorData = {
            id: defaultConnector.id,
            probability: defaultConnector.probability,
            connectType: defaultConnector.connectType,
            operationSteps: defaultConnector.operationSteps
        };

        ComponentLogger.log(LOG_PREFIX, `Setting element data for connector ID: ${line.id}`, storedData);
        
        // Set up both data and metadata
        storageAdapter.setElementData(
            line,
            storedData,
            SimulationObjectType.Connector,
            {
                version: "1.0.0"
            }
        );

        // Create and return the ConnectorLucid instance
        return new ConnectorLucid(line, storageAdapter);
    }
}