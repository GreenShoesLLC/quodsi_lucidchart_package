import { ScenarioPropertyName } from "../../types/elements/ScenarioPropertyName";
import { ScenarioSetterType } from "../../types/elements/ScenarioSetterType";
export interface ChangeRequestValidationResult {
    valid: boolean;
    error?: string;
    warning?: string;
}
/**
 * Validates a scenario change request value based on the property and setter type.
 * Returns validation errors (blocking) and warnings (non-blocking hints).
 */
export declare function validateChangeRequestValue(propertyName: ScenarioPropertyName, setterType: ScenarioSetterType, value: number): ChangeRequestValidationResult;
/**
 * Returns whether the given property requires integer input for the given setter type.
 * MULTIPLY and DIVIDE always allow floats (the engine rounds the result).
 */
export declare function isIntegerInput(propertyName: ScenarioPropertyName, setterType: ScenarioSetterType): boolean;
//# sourceMappingURL=ScenarioChangeValidation.d.ts.map