import { ModelDefinition } from '../types/elements/ModelDefinition';
import { IModelDefinitionSerializer } from './interfaces/IModelDefinitionSerializer';
import { ISchemaVersion } from './interfaces/ISchemaVersion';
import { ModelDefinitionSerializerV1 } from './v1/ModelDefinitionSerializerV1';
import { UnsupportedVersionError } from './errors/UnsupportedVersionError';

export class SchemaVersion implements ISchemaVersion {
    constructor(
        public readonly major: number,
        public readonly minor: number
    ) {}

    toString(): string {
        return `${this.major}.${this.minor}`;
    }

    equals(other: ISchemaVersion): boolean {
        return this.major === other.major && this.minor === other.minor;
    }
}

export class ModelSerializerFactory {
    private static readonly SUPPORTED_VERSIONS: SchemaVersion[] = [
        new SchemaVersion(1, 0)
    ];

    private static readonly CURRENT_VERSION: SchemaVersion = 
        ModelSerializerFactory.SUPPORTED_VERSIONS[
            ModelSerializerFactory.SUPPORTED_VERSIONS.length - 1
        ];

    /**
     * Creates a serializer for the specified model definition and version.
     * If no version is specified, uses the latest supported version.
     */
    static create(
        modelDefinition: ModelDefinition, 
        version: ISchemaVersion = ModelSerializerFactory.CURRENT_VERSION
    ): IModelDefinitionSerializer {
        if (!ModelSerializerFactory.isVersionSupported(version)) {
            throw new UnsupportedVersionError(version);
        }

        if (version.major === 1 && version.minor === 0) {
            return new ModelDefinitionSerializerV1();
        }

        // This should never happen due to the isVersionSupported check above
        throw new UnsupportedVersionError(version);
    }

    /**
     * Gets the current (latest) supported version.
     */
    static getCurrentVersion(): ISchemaVersion {
        return ModelSerializerFactory.CURRENT_VERSION;
    }

    /**
     * Checks if the specified version is supported.
     */
    static isVersionSupported(version: ISchemaVersion): boolean {
        return ModelSerializerFactory.SUPPORTED_VERSIONS.some(
            supportedVersion => supportedVersion.equals(version)
        );
    }

    /**
     * Gets all supported versions.
     */
    static getSupportedVersions(): ISchemaVersion[] {
        return [...ModelSerializerFactory.SUPPORTED_VERSIONS];
    }

    /**
     * Gets a list of supported version strings.
     */
    static getSupportedVersionStrings(): string[] {
        return ModelSerializerFactory.SUPPORTED_VERSIONS.map(v => v.toString());
    }
}
