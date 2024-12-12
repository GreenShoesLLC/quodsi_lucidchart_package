import { MessageTypes } from '../MessageTypes';
import { ValidationResult } from '../../validation/ValidationTypes';
export interface ValidationPayloads {
    [MessageTypes.VALIDATE_MODEL]: undefined;
    [MessageTypes.VALIDATION_RESULT]: ValidationResult;
}
//# sourceMappingURL=ValidationPayloads.d.ts.map