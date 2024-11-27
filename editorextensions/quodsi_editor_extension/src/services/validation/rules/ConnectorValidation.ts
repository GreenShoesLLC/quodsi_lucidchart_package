import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '../../../shared/types/ValidationTypes';
import { ModelState } from '../interfaces/ModelState';

export class ConnectorValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void {
        // Validate each connector
        for (const [connectorId, connection] of state.connections) {
            // Validate source exists
            if (!state.elements.has(connection.sourceId)) {
                messages.push({
                    type: 'error',
                    message: `Connector ${connectorId} has invalid source (${connection.sourceId})`,
                    elementId: connectorId
                });
            }

            // Validate target exists
            if (!state.elements.has(connection.targetId)) {
                messages.push({
                    type: 'error',
                    message: `Connector ${connectorId} has invalid target (${connection.targetId})`,
                    elementId: connectorId
                });
            }

            // Validate probability
            if (typeof connection.probability !== 'number' ||
                connection.probability < 0 ||
                connection.probability > 1) {
                messages.push({
                    type: 'error',
                    message: `Connector ${connectorId} has invalid probability: ${connection.probability}`,
                    elementId: connectorId
                });
            }

            // Validate connector element data
            const connector = state.elements.get(connectorId);
            if (connector) {
                this.validateConnectorData(connector, messages);
            }
        }

        // Validate probability distributions for outgoing connections
        this.validateProbabilityDistributions(state, messages);
    }

    private validateConnectorData(connector: any, messages: ValidationMessage[]): void {
        // Validate name
        if (!connector.name || connector.name.trim().length === 0) {
            messages.push({
                type: 'warning',
                message: `Connector ${connector.id} has no name`,
                elementId: connector.id
            });
        }

        // Validate routing configuration if present
        if (connector.routing) {
            if (!connector.routing.type) {
                messages.push({
                    type: 'error',
                    message: `Connector ${connector.id} has no routing type specified`,
                    elementId: connector.id
                });
            }
        }
    }

    private validateProbabilityDistributions(state: ModelState, messages: ValidationMessage[]): void {
        // Group connections by source
        const connectionsBySource = new Map<string, Array<{ id: string, probability: number }>>();

        for (const [id, connection] of state.connections) {
            const connections = connectionsBySource.get(connection.sourceId) || [];
            connections.push({ id, probability: connection.probability });
            connectionsBySource.set(connection.sourceId, connections);
        }

        // Check probability sum for each source
        for (const [sourceId, connections] of connectionsBySource) {
            const probSum = connections.reduce((sum, conn) => sum + conn.probability, 0);

            // Allow for small floating-point differences
            if (Math.abs(probSum - 1.0) > 0.0001) {
                messages.push({
                    type: 'error',
                    message: `Outgoing connection probabilities from element ${sourceId} sum to ${probSum.toFixed(4)} (should be 1.0)`,
                    elementId: sourceId
                });
            }
        }
    }
}