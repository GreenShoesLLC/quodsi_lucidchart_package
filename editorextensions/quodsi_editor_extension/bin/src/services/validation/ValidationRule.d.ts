import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
/**
 * Base class for validation rules
 */
export declare abstract class ValidationRule {
    /**
     * Flag to enable or disable logging across all validation rules.
     */
    protected loggingEnabled: boolean;
    /**
     * Method to toggle logging.
     * @param enabled - True to enable logging, false to disable.
     */
    setLogging(enabled: boolean): void;
    /**
     * Checks if logging is enabled.
     * @returns True if logging is enabled, false otherwise.
     */
    protected isLoggingEnabled(): boolean;
    /**
     * Logs a message if logging is enabled.
     * @param message - The message to log.
     */
    protected log(message: string): void;
    abstract validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
}
//# sourceMappingURL=ValidationRule.d.ts.map