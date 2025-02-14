import { SerializerError } from './SerializerError';
import { ISchemaVersion } from '../interfaces/ISchemaVersion';

export class UnsupportedVersionError extends SerializerError {
    constructor(version: ISchemaVersion) {
        super(`Version ${version.toString()} is not supported`);
        this.name = 'UnsupportedVersionError';
        Object.setPrototypeOf(this, UnsupportedVersionError.prototype);
    }
}
