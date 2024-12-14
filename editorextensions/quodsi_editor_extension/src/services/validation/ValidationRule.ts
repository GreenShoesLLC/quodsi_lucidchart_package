import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";

/**
 * Base class for validation rules
 */
export abstract class ValidationRule {
    /**
     * Flag to enable or disable logging across all validation rules.
     */
    protected loggingEnabled: boolean = false;

    /**
     * Method to toggle logging.
     * @param enabled - True to enable logging, false to disable.
     */
    public setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
    }

    /**
     * Checks if logging is enabled.
     * @returns True if logging is enabled, false otherwise.
     */
    protected isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }

    /**
     * Logs a message if logging is enabled.
     * @param message - The message to log.
     */
    protected log(message: string): void {
        if (this.isLoggingEnabled()) {
            console.log(`[${this.constructor.name}] ${message}`);
        }
    }
    
    abstract validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
}
