import { ValidationMessage } from '../ValidationTypes';
export interface ValidationState {
    summary: {
        errorCount: number;
        warningCount: number;
    };
    messages: ValidationMessage[];
}
//# sourceMappingURL=ValidationState.d.ts.map