import { LineProxy, BlockProxy } from 'lucid-extension-sdk';
import { 
    Connector,
    ConnectType,
    OperationStep,
    SimulationObjectType 
} from '@quodsi/shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';


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

        // Create connector with element-specific properties
        const connector = new Connector(
            this.platformElementId,
            this.getElementName('Connector'),
            line.getEndpoint1().connection?.id || '',
            line.getEndpoint2().connection?.id || '',
            1.0,  // default probability
            ConnectType.Probability,  // default connectType
            []  // default operationSteps
        );

        // Get stored custom data
        const storedData = this.storageAdapter.getElementData(this.element) as StoredConnectorData;

        if (storedData) {
            // Only copy specific properties we want from stored data
            connector.probability = storedData.probability ?? 1.0;
            connector.connectType = storedData.connectType ?? ConnectType.Probability;
            connector.operationSteps = storedData.operationSteps || [];
        }

        return connector;
    }


    public updateFromPlatform(): void {
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

        this.storageAdapter.updateElementData(this.element, dataToStore);
    }

    protected getElementName(defaultPrefix: string): string {
        // Check for text areas on the line
        const line = this.element as LineProxy;
        for (const [, text] of line.textAreas) {
            if (text && text.trim()) {
                return text.trim();
            }
        }
        
        // If no text found, generate a name based on endpoints
        const sourceName = this.getEndpointName(line.getEndpoint1().connection?.id);
        const targetName = this.getEndpointName(line.getEndpoint2().connection?.id);

        if (sourceName && targetName) {
            return `${sourceName} → ${targetName}`;
        }

        return `${defaultPrefix} ${line.id}`;
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
}