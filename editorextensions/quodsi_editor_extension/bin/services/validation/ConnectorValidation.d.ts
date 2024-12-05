import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '../../shared/types/ValidationTypes';
import { ModelState } from './ModelState';
export declare class ConnectorValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void;
    private validateConnectorData;
    private validateProbabilityDistributions;
}
