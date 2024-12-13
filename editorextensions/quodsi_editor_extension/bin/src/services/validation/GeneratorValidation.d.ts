import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '@quodsi/shared';
import { ModelDefinitionState } from './ModelDefinitionState';
export declare class GeneratorValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
    private validateGeneratorConnectivity;
    private validateGeneratorData;
}
//# sourceMappingURL=GeneratorValidation.d.ts.map