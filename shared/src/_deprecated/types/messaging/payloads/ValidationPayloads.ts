import { MessageTypes } from '../MessageTypes';
import { ValidationResult } from '../../../../types/validation/ValidationTypes';

export interface ValidationPayloads {
    // [MessageTypes.VALIDATE_MODEL]: undefined;
    [MessageTypes.VALIDATION_RESULT]: ValidationResult;
}