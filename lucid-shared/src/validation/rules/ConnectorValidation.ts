import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from '../common/ValidationMessages';
import { ConnectType } from '../../types/elements/ConnectType';
import { ValidationIssue, ValidationSeverity } from '../../quodsi-messaging/validation/types';
import { Connector } from '../../types/elements/Connector';
import { Activity } from '../../types/elements/Activity';

export class ConnectorValidation extends ValidationRule {
    private static readonly MAX_OUTGOING_CONNECTIONS = 20;

    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const connectors: Connector[] = state.modelDefinition.connectors.getAll();
        const connectorsBySource = this.groupConnectorsBySource(connectors);

        this.log("Starting validation of individual connectors.");

        connectors.forEach(connector => {
            this.validateConnectorEndpoints(connector, state, issues);
            this.validateConnectorData(connector, issues);
        });

        this.log("Validating weight values for connector groups.");
        connectorsBySource.forEach((sourceConnectors, sourceId) => {
            this.validateWeightGroup(sourceId, sourceConnectors, state, issues);
        });

        this.log("Detecting circular references in connectors.");
        this.detectCircularReferences(state, issues);

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
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates that the endpoints of a connector (source and target) are valid.
         */

        this.log(`Validating endpoints for Connector ID: ${connector.id}`);

        const sourceActivity = state.modelDefinition.activities.get(connector.sourceId);

        const sourceGenerator = state.modelDefinition.generators.get(connector.sourceId);
        if (!sourceActivity && !sourceGenerator) {
            this.log(`Connector ID ${connector.id} has an invalid source ID: ${connector.sourceId}`);
            issues.push(ValidationMessages.invalidConnection(
                connector.id,
                'source',
                connector.sourceId
            ));
        }

        const targetActivity = state.modelDefinition.activities.get(connector.targetId);
        if (!targetActivity) {
            this.log(`Connector ID ${connector.id} has an invalid target ID: ${connector.targetId}`);
            issues.push(ValidationMessages.invalidConnection(
                connector.id,
                'target',
                connector.targetId
            ));
        }

        if (connector.sourceId === connector.targetId) {
            this.log(`Connector ID ${connector.id} is self-referencing.`);
            issues.push(ValidationMessages.isolatedElement('Connector', connector.id));
        }
    }

    private validateConnectorData(connector: Connector, issues: ValidationIssue[]): void {
        /**
         * Validates the data properties of a connector, including name, probability, and operation steps.
         */

        this.log(`Validating data for Connector ID: ${connector.id}`);

        if (!connector.name || connector.name.trim().length === 0) {
            this.log(`Connector ID ${connector.id} has a missing name.`);
            issues.push(ValidationMessages.missingName('Connector', connector.id));
        }

        if (typeof connector.weight !== 'number' || connector.weight <= 0) {
            this.log(`Connector ID ${connector.id} has an invalid weight: ${connector.weight}`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'invalid_connector_weight',
                `Connector ${connector.id} has invalid weight (must be greater than 0)`,
                connector.id
            ));
        }
    }

    // Note: validateConnectorType removed - connectType is now on Activity, not Connector

    private validateWeightGroup(
        sourceId: string,
        connectors: Connector[],
        state: ModelDefinitionState,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates the weight values of connectors originating from the same source.
         */

        this.log(`Validating weight group for Source ID: ${sourceId}`);

        // Get the source activity to check its connectType
        const sourceActivity = state.modelDefinition.activities.get(sourceId);

        // Only validate weights if the source is an Activity with Probability connectType
        if (!sourceActivity || sourceActivity.connectType !== ConnectType.Probability) {
            return;
        }

        // Check for zero or negative weights
        connectors.forEach((connector, idx) => {
            if (!connector.weight || connector.weight <= 0) {
                this.log(`Connector ID ${connector.id} has invalid weight: ${connector.weight}`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.WARNING,
                    'connector_invalid_weight',
                    `Connector ${idx + 1} from activity ${sourceId} has weight ${connector.weight || 0}. Weight must be greater than 0.`,
                    connector.id
                ));
            }
        });

        if (connectors.length > ConnectorValidation.MAX_OUTGOING_CONNECTIONS) {
            this.log(`Source ID ${sourceId} has too many outgoing connections: ${connectors.length}`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.WARNING,
                'too_many_outgoing_connections',
                `Activity ${sourceId} has unusually high number of outgoing connections (${connectors.length})`,
                sourceId
            ));
        }
    }

    private detectCircularReferences(
        state: ModelDefinitionState,
        issues: ValidationIssue[]
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
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.WARNING,
                    'circular_reference',
                    `Circular reference detected: ${[...path, nodeId].join(' -> ')}`,
                    nodeId
                ));
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
