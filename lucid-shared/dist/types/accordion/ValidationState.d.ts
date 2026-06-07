import { ValidationIssue } from "../../quodsi-messaging/validation/types";
export interface ValidationState {
    summary: {
        errorCount: number;
        warningCount: number;
        infoCount: number;
    };
    issues: ValidationIssue[];
}
//# sourceMappingURL=ValidationState.d.ts.map