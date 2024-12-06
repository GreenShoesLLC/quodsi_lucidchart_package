import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '@quodsi/shared';
import { ModelState } from './ModelState';
export declare class GeneratorValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void;
    private validateGeneratorConnectivity;
    private validateGeneratorData;
}
