import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '../../../shared/types/ValidationTypes';
import { ModelState } from '../interfaces/ModelState';
export declare class ResourceValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void;
    private validateResourceData;
}