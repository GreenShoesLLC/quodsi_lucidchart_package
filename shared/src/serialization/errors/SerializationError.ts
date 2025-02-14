import { SerializerError } from './SerializerError';

export class SerializationError extends SerializerError {
    constructor(
        component: string,
        details: string,
        originalError?: Error
    ) {
        const message = originalError 
            ? `Failed to serialize ${component}: ${details}. Original error: ${originalError.message}`
            : `Failed to serialize ${component}: ${details}`;
            
        super(message);
        this.name = 'SerializationError';
        Object.setPrototypeOf(this, SerializationError.prototype);
    }
}
