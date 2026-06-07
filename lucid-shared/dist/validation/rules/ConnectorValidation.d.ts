import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationIssue } from '../../quodsi-messaging/validation/types';
export declare class ConnectorValidation extends ValidationRule {
    private static readonly MAX_OUTGOING_CONNECTIONS;
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void;
    private groupConnectorsBySource;
    private validateConnectorEndpoints;
    private validateConnectorData;
    private validateWeightGroup;
    private detectCircularReferences;
}
//# sourceMappingURL=ConnectorValidation.d.ts.map