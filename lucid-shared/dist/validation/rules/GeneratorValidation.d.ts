import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationIssue } from "../../quodsi-messaging/validation/types";
export declare class GeneratorValidation extends ValidationRule {
    private static readonly MIN_ENTITIES_PER_CREATION;
    private static readonly MAX_ENTITIES_PER_CREATION;
    private static readonly MIN_PERIODIC_OCCURRENCES;
    private static readonly MIN_MAX_ENTITIES;
    private static readonly MAX_MAX_ENTITIES;
    /**
     * Helper to extract a numeric value from a Duration.
     * For constant distributions, returns the value.
     * For other distributions, returns the mean/expected value if determinable.
     * Returns undefined if duration is invalid or value cannot be determined.
     */
    private getDurationValue;
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void;
    private validateGeneratorData;
    private validateDurationSettings;
    private validateEntitySettings;
    private validateExitConnector;
    private validateGeneratorInteractions;
}
//# sourceMappingURL=GeneratorValidation.d.ts.map