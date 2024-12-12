import { ValidationMessage } from "../validation/ValidationTypes";


export interface ValidationState {
    summary: {
        errorCount: number;
        warningCount: number;
    };
    messages: ValidationMessage[];
}