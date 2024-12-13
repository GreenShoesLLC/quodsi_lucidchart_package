import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '@quodsi/shared';
import { ModelDefinitionState } from './ModelDefinitionState';
export declare class ConnectorValidation extends ValidationRule {
    private static readonly PROBABILITY_TOLERANCE;
    private static readonly MAX_OUTGOING_CONNECTIONS;
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
    private groupConnectorsBySource;
    private validateConnectorEndpoints;
    private validateConnectorData;
    private validateConnectorType;
    private validateProbabilityGroup;
    private detectCircularReferences;
}
//# sourceMappingURL=ConnectorValidation.d.ts.map