import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '@quodsi/shared';
import { ModelDefinitionState } from './ModelDefinitionState';
import { ValidationMessages } from './ValidationMessages';
import { Connector } from '@quodsi/shared';
import { ConnectType } from '@quodsi/shared';

export class ConnectorValidation extends ValidationRule {
    private static readonly PROBABILITY_TOLERANCE = 0.0001;
    private static readonly MAX_OUTGOING_CONNECTIONS = 20;

    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const connectors = state.modelDefinition.connectors.getAll();
        const connectorsBySource = this.groupConnectorsBySource(connectors);

        // Validate individual connectors
        connectors.forEach(connector => {
            this.validateConnectorEndpoints(connector, state, messages);
            this.validateConnectorData(connector, messages);
            this.validateConnectorType(connector, messages);
        });

        // Validate probability distributions for each source
        connectorsBySource.forEach((sourceConnectors, sourceId) => {
            this.validateProbabilityGroup(sourceId, sourceConnectors, messages);
        });

        // Check for circular references
        this.detectCircularReferences(state, messages);
    }

    private groupConnectorsBySource(connectors: Connector[]): Map<string, Connector[]> {
        const groups = new Map<string, Connector[]>();
        connectors.forEach(connector => {
            const sourceConnectors = groups.get(connector.sourceId) || [];
            sourceConnectors.push(connector);
            groups.set(connector.sourceId, sourceConnectors);
        });
        return groups;
    }

    private validateConnectorEndpoints(
        connector: Connector,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        // Validate source exists
        const sourceActivity = state.modelDefinition.activities.get(connector.sourceId);
        if (!sourceActivity) {
            messages.push(ValidationMessages.invalidConnection(
                connector.id,
                'source',
                connector.sourceId
            ));
        }

        // Validate target exists
        const targetActivity = state.modelDefinition.activities.get(connector.targetId);
        if (!targetActivity) {
            messages.push(ValidationMessages.invalidConnection(
                connector.id,
                'target',
                connector.targetId
            ));
        }

        // Validate self-connections
        if (connector.sourceId === connector.targetId) {
            messages.push(ValidationMessages.isolatedElement('Connector', connector.id));
        }
    }

    private validateConnectorData(connector: Connector, messages: ValidationMessage[]): void {
        // Validate name
        if (!connector.name || connector.name.trim().length === 0) {
            messages.push(ValidationMessages.missingName('Connector', connector.id));
        }

        // Validate probability
        if (typeof connector.probability !== 'number' ||
            connector.probability < 0 ||
            connector.probability > 1) {
            messages.push({
                type: 'error',
                message: `Connector ${connector.id} has invalid probability (must be between 0 and 1)`,
                elementId: connector.id
            });
        }

        // Validate operation steps if present
        if (connector.operationSteps && connector.operationSteps.length > 0) {
            connector.operationSteps.forEach((step, index) => {
                if (!step.duration) {
                    messages.push({
                        type: 'error',
                        message: `Connector ${connector.id} operation step ${index + 1} has no duration specified`,
                        elementId: connector.id
                    });
                }
            });
        }
    }

    private validateConnectorType(connector: Connector, messages: ValidationMessage[]): void {
        if (!Object.values(ConnectType).includes(connector.connectType)) {
            messages.push({
                type: 'error',
                message: `Connector ${connector.id} has invalid connect type: ${connector.connectType}`,
                elementId: connector.id
            });
        }
    }

    private validateProbabilityGroup(
        sourceId: string,
        connectors: Connector[],
        messages: ValidationMessage[]
    ): void {
        const probabilityConnectors = connectors.filter(
            c => c.connectType === ConnectType.Probability
        );

        if (probabilityConnectors.length > 0) {
            const totalProbability = probabilityConnectors.reduce(
                (sum, connector) => sum + connector.probability,
                0
            );

            if (Math.abs(totalProbability - 1.0) > ConnectorValidation.PROBABILITY_TOLERANCE) {
                messages.push({
                    type: 'error',
                    message: `Outgoing connection probabilities from activity ${sourceId} sum to ${totalProbability.toFixed(4)} (should be 1.0)`,
                    elementId: sourceId
                });
            }
        }

        if (connectors.length > ConnectorValidation.MAX_OUTGOING_CONNECTIONS) {
            messages.push({
                type: 'warning',
                message: `Activity ${sourceId} has unusually high number of outgoing connections (${connectors.length})`,
                elementId: sourceId
            });
        }
    }

    private detectCircularReferences(
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        const visited = new Set<string>();
        const stack = new Set<string>();

        const detectCycle = (nodeId: string, path: string[] = []): boolean => {
            if (stack.has(nodeId)) {
                messages.push({
                    type: 'warning',
                    message: `Circular reference detected: ${[...path, nodeId].join(' -> ')}`,
                    elementId: nodeId
                });
                return true;
            }

            if (visited.has(nodeId)) return false;

            visited.add(nodeId);
            stack.add(nodeId);

            const outgoingConnectors = state.modelDefinition.connectors.getAll()
                .filter(c => c.sourceId === nodeId);

            for (const connector of outgoingConnectors) {
                if (detectCycle(connector.targetId, [...path, nodeId])) {
                    return true;
                }
            }

            stack.delete(nodeId);
            return false;
        };

        state.modelDefinition.activities.getAll().forEach(activity => {
            if (!visited.has(activity.id)) {
                detectCycle(activity.id);
            }
        });
    }
}