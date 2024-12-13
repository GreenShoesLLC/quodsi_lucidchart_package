import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '@quodsi/shared';
import { ModelDefinitionState } from './ModelDefinitionState';
export declare class GeneratorValidation extends ValidationRule {
    private static readonly MIN_ENTITIES_PER_CREATION;
    private static readonly MAX_ENTITIES_PER_CREATION;
    private static readonly MIN_PERIODIC_OCCURRENCES;
    private static readonly MIN_MAX_ENTITIES;
    private static readonly MAX_MAX_ENTITIES;
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
    private validateGeneratorConnectivity;
    private validateGeneratorData;
    private validateDurationSettings;
    private validateEntitySettings;
    private validateGeneratorInteractions;
}
//# sourceMappingURL=GeneratorValidation.d.ts.map