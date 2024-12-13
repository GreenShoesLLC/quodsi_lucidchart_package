import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '@quodsi/shared';
import { ModelDefinitionState } from './ModelDefinitionState';
export declare class ConnectorValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
    private validateConnectorData;
    private validateProbabilityDistributions;
}
//# sourceMappingURL=ConnectorValidation.d.ts.map