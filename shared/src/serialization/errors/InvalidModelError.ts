import { SerializerError } from './SerializerError';

export class InvalidModelError extends SerializerError {
    constructor(details: string) {
        super(`Invalid model: ${details}`);
        this.name = 'InvalidModelError';
        Object.setPrototypeOf(this, InvalidModelError.prototype);
    }
}
