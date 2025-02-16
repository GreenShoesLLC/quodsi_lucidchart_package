import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from '../common/ValidationMessages';
import { ValidationMessage } from 'src/types/validation';
import { Connector } from 'src/types/elements/Connector';
import { ConnectType } from 'src/types/elements/ConnectType';
import { Activity } from 'src/types/elements/Activity';


export class ConnectorValidation extends ValidationRule {
    private static readonly PROBABILITY_TOLERANCE = 0.0001;
    private static readonly MAX_OUTGOING_CONNECTIONS = 20;

    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const connectors: Connector[] = state.modelDefinition.connectors.getAll();
        const connectorsBySource = this.groupConnectorsBySource(connectors);

        this.log("Starting validation of individual connectors.");

        connectors.forEach(connector => {
            this.validateConnectorEndpoints(connector, state, messages);
            this.validateConnectorData(connector, messages);
            this.validateConnectorType(connector, messages);
        });

        this.log("Validating probability distributions for connector groups.");
        connectorsBySource.forEach((sourceConnectors, sourceId) => {
            this.validateProbabilityGroup(sourceId, sourceConnectors, messages);
        });

        this.log("Detecting circular references in connectors.");
        this.detectCircularReferences(state, messages);

        this.log("Completed validation of connectors.");
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
        /**
         * Validates that the endpoints of a connector (source and target) are valid.
         */

        this.log(`Validating endpoints for Connector ID: ${connector.id}`);

        const sourceActivity = state.modelDefinition.activities.get(connector.sourceId);

        const sourceGenerator = state.modelDefinition.generators.get(connector.sourceId);
        if (!sourceActivity && !sourceGenerator) {
            this.log(`Connector ID ${connector.id} has an invalid source ID: ${connector.sourceId}`);
            messages.push(ValidationMessages.invalidConnection(
                connector.id,
                'source',
                connector.sourceId
            ));
        }

        const targetActivity = state.modelDefinition.activities.get(connector.targetId);
        if (!targetActivity) {
            this.log(`Connector ID ${connector.id} has an invalid target ID: ${connector.targetId}`);
            messages.push(ValidationMessages.invalidConnection(
                connector.id,
                'target',
                connector.targetId
            ));
        }

        if (connector.sourceId === connector.targetId) {
            this.log(`Connector ID ${connector.id} is self-referencing.`);
            messages.push(ValidationMessages.isolatedElement('Connector', connector.id));
        }
    }

    private validateConnectorData(connector: Connector, messages: ValidationMessage[]): void {
        /**
         * Validates the data properties of a connector, including name, probability, and operation steps.
         */

        this.log(`Validating data for Connector ID: ${connector.id}`);

        if (!connector.name || connector.name.trim().length === 0) {
            this.log(`Connector ID ${connector.id} has a missing name.`);
            messages.push(ValidationMessages.missingName('Connector', connector.id));
        }

        if (typeof connector.probability !== 'number' ||
            connector.probability < 0 ||
            connector.probability > 1) {
            this.log(`Connector ID ${connector.id} has an invalid probability: ${connector.probability}`);
            messages.push({
                type: 'error',
                message: `Connector ${connector.id} has invalid probability (must be between 0 and 1)`,
                elementId: connector.id
            });
        }

        if (connector.operationSteps && connector.operationSteps.length > 0) {
            connector.operationSteps.forEach((step, index) => {
                if (!step.duration) {
                    this.log(`Connector ID ${connector.id} operation step ${index + 1} has no duration.`);
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
        /**
         * Validates the type of the connector to ensure it is a valid `ConnectType`.
         */

        this.log(`Validating type for Connector ID: ${connector.id}`);

        if (!Object.values(ConnectType).includes(connector.connectType)) {
            this.log(`Connector ID ${connector.id} has an invalid connect type: ${connector.connectType}`);
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
        /**
         * Validates the probability distribution of connectors originating from the same source.
         */

        this.log(`Validating probability group for Source ID: ${sourceId}`);

        const probabilityConnectors = connectors.filter(
            c => c.connectType === ConnectType.Probability
        );

        if (probabilityConnectors.length > 0) {
            const totalProbability = probabilityConnectors.reduce(
                (sum, connector) => sum + connector.probability,
                0
            );

            if (Math.abs(totalProbability - 1.0) > ConnectorValidation.PROBABILITY_TOLERANCE) {
                this.log(`Probability sum for Source ID ${sourceId} is invalid: ${totalProbability.toFixed(4)}`);
                messages.push({
                    type: 'error',
                    message: `Outgoing connection probabilities from activity ${sourceId} sum to ${totalProbability.toFixed(4)} (should be 1.0)`,
                    elementId: sourceId
                });
            }
        }

        if (connectors.length > ConnectorValidation.MAX_OUTGOING_CONNECTIONS) {
            this.log(`Source ID ${sourceId} has too many outgoing connections: ${connectors.length}`);
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
        /**
         * Detects circular references in the graph of connectors.
         */

        this.log("Detecting circular references in connectors.");

        const visited = new Set<string>();
        const stack = new Set<string>();

        const detectCycle = (nodeId: string, path: string[] = []): boolean => {
            if (stack.has(nodeId)) {
                this.log(`Circular reference detected: ${[...path, nodeId].join(' -> ')}`);
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
                .filter((c: Connector) => c.sourceId === nodeId);

            for (const connector of outgoingConnectors) {
                if (detectCycle(connector.targetId, [...path, nodeId])) {
                    return true;
                }
            }

            stack.delete(nodeId);
            return false;
        };

        state.modelDefinition.activities.getAll().forEach((activity: Activity) => {
            if (!visited.has(activity.id)) {
                detectCycle(activity.id);
            }
        });
    }
}
