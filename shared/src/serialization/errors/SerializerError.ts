export class SerializerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SerializerError';
        Object.setPrototypeOf(this, SerializerError.prototype);
    }
}
