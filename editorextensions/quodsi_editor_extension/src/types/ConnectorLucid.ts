import { LineProxy, BlockProxy } from 'lucid-extension-sdk';
import {
    Connector,
    SimulationObjectType,
    ComponentLogger,
    StateCondition,
    StateModification,
    MappingSource,
    ScenarioLever,
    Action,
    pickConnectorName,
    pickName
} from '@quodsi/lucid-shared';
import { SimObjectLucid } from './SimObjectLucid';
import { StorageAdapter } from '../core/StorageAdapter';
import { blockToNameable, lineToNameable } from './nameableShape';
import { hydrateActions } from './hydrateActions';

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
    priority?: number;
    // Wire-cleanup Phase B2 Task 9: `entityTemplateUniqueId` renamed to
    // `entityId` (matches `Connector.entityId`); `stateCondition` renamed to
    // `condition`; the old standalone `stateModifications` array has no
    // `Connector` field any more — connector-level state changes are
    // expressed as an ASSIGN action inside `actions` now.
    entityId?: string;
    condition?: any;
    levers?: ScenarioLever[];
    // Connector-level behavior lives in actions (move time / departure / arrival assigns).
    actions?: Action[];
}

/**
 * The endpoints a LINE is currently attached to, restricted to only the
 * ATTACHED ends -- a detached endpoint (`connection === undefined`) is
 * omitted entirely rather than reported as `undefined`, so a caller that
 * overlays this onto stored data leaves a detached end's stored value
 * untouched.
 *
 * Pulled out of `refreshEndpointIds` (below) so PasteNormalizer's Connector
 * rule (Task 7) can apply the identical "live line wins, detached end keeps
 * storage" semantics without duplicating the logic -- see the doc comment on
 * `refreshEndpointIds` for why the live line wins.
 */
export function liveEndpointIds(line: LineProxy): { sourceId?: string; targetId?: string } {
    const result: { sourceId?: string; targetId?: string } = {};
    const liveSourceId = line.getEndpoint1().connection?.id;
    const liveTargetId = line.getEndpoint2().connection?.id;
    if (liveSourceId) result.sourceId = liveSourceId;
    if (liveTargetId) result.targetId = liveTargetId;
    return result;
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
            // The LIVE line wins over storage for both endpoints -- see
            // refreshEndpointIds. Storage is the fallback for a DETACHED end
            // (connection === undefined), which is the one case the canvas
            // cannot answer.
            endpoint1.connection?.id || storedData?.sourceId || '',
            endpoint2.connection?.id || storedData?.targetId || '',
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

        // Deserialize condition (routing guard for STATE_CONDITION connectors)
        if (storedData?.condition) {
            connector.condition = StateCondition.fromJSON(storedData.condition);
        }

        // Restore priority
        if (storedData?.priority !== undefined) {
            connector.priority = storedData.priority;
        }

        // Restore entity template id (routing selector for ENTITY_TEMPLATE connectors)
        if (storedData?.entityId) {
            connector.entityId = storedData.entityId;
        }

        // Carry forward scenario-lever authoring metadata. `levers` is a class
        // field (not a constructor param) defaulting to [], so reconstruction
        // drops it unless copied here -> published model.json loses levers.
        if (storedData?.levers) {
            connector.levers = storedData.levers;
        }

        // Connector actions (move time + departure/arrival assigns). Like
        // `levers`, `actions` is a class field defaulting to [], so it must
        // be copied explicitly; hydrate so StateModification instances are
        // real class instances (same as ActivityLucid).
        connector.actions = hydrateActions(storedData?.actions);

        // Update platform-specific fields after creation
        this.updatePlatformSpecificFields(connector);

        return connector;
    }

    /**
     * The endpoints a connector reports must be the blocks the LINE is
     * attached to right now, not the ones its stored blob remembers.
     *
     * Lucid copies shapeData wholesale on paste, so a pasted connector
     * arrives carrying the ORIGINAL's sourceId/targetId while the pasted line
     * is attached to the pasted blocks. Preferring storage meant the copy
     * published routing into the ORIGINAL's activities, with the diagram and
     * the model disagreeing silently. Re-attaching an endpoint by hand had
     * the same failure from the other side.
     *
     * A DETACHED endpoint is the exception: LineProxy reports `connection ===
     * undefined` and the canvas simply has no answer, so the stored id is
     * left in place rather than blanked -- a line dragged loose must not lose
     * the routing it was given.
     */
    private refreshEndpointIds(connector: Connector): void {
        const line = this.element as LineProxy;
        const { sourceId, targetId } = liveEndpointIds(line);

        if (sourceId) connector.sourceId = sourceId;
        if (targetId) connector.targetId = targetId;
    }

    private updatePlatformSpecificFields(connector: Connector): void {
        const line = this.element as LineProxy;
        const endpoint1 = line.getEndpoint1();
        const endpoint2 = line.getEndpoint2();

        // Update source and target locations
        connector.setSourceLocation(endpoint1.x, endpoint1.y);
        connector.setTargetLocation(endpoint2.x, endpoint2.y);

        // ...and the endpoints themselves, from the live line.
        this.refreshEndpointIds(connector);

        // Update name if needed
        if (!connector.name || connector.name === 'New Connector') {
            connector.name = this.getElementName('Connector');
        }

        ComponentLogger.log(LOG_PREFIX, 'Updated platform-specific fields', {
            sourceX: connector.sourceX,
            sourceY: connector.sourceY,
            targetX: connector.targetX,
            targetY: connector.targetY,
            sourceId: connector.sourceId,
            targetId: connector.targetId,
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

        // ...and the endpoints, so the write-back below persists what the line
        // is attached to NOW. This runs on a line that may have been
        // re-attached since the simObject was constructed, so re-reading here
        // is not redundant with createSimObject's own refresh.
        this.refreshEndpointIds(this.simObject);

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
            priority: this.simObject.priority,
            entityId: this.simObject.entityId,
            condition: this.simObject.condition?.toJSON(),
            // Levers survive the write-back (conditional — see ActivityLucid).
            levers: this.simObject.levers?.length ? this.simObject.levers : undefined,
            // ALWAYS an array: updateElementData merges and skips undefined,
            // so `[]` is the only way a cleared move time reaches storage.
            actions: this.simObject.actions ?? []
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

    /**
     * The name of the element an endpoint block was CONVERTED to — falling back
     * to the block's canvas text when it isn't converted (or carries no name).
     *
     * Not `getNameFromBlock`: that reads the block's raw text, which is the
     * right source for the block itself but the WRONG source for a connector.
     * Blocks are converted before lines, and the blocks loop appends _2/_3 to
     * de-duplicate same-named shapes — a suffix that lives only in the element
     * data, never in the canvas text. Reading the text here named every
     * connector into "Process_2" after "Process" instead, so two connectors
     * collided on one name, DuplicateNameValidation raised an ERROR, and the
     * user was stuck because connectors can't be renamed in the UI.
     * (ClickUp 86e233g6f; drawio resolves the same way via resolveShapeName.)
     */
    private static resolveEndpointName(
        block: BlockProxy,
        storageAdapter: StorageAdapter,
        defaultPrefix: string
    ): string {
        const converted = storageAdapter.getElementData<{ name?: string }>(block);
        const convertedName = converted?.name?.trim();
        if (convertedName) return convertedName;
        return pickName(blockToNameable(block), {
            typeLabel: defaultPrefix,
            includeMasterName: true,
        });
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

            const sourceName = sourceBlock
                ? this.resolveEndpointName(sourceBlock, storageAdapter, 'Source')
                : 'Source';
            const targetName = targetBlock
                ? this.resolveEndpointName(targetBlock, storageAdapter, 'Target')
                : 'Target';

            name = pickConnectorName(lineToNameable(line), { sourceName, targetName });
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
            entityId: defaultConnector.entityId,
            condition: defaultConnector.condition?.toJSON()
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