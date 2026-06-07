import { ModelDefinition } from '../types/elements/ModelDefinition';
import { IModelDefinitionSerializer } from './interfaces/IModelDefinitionSerializer';
import { ISchemaVersion } from './interfaces/ISchemaVersion';
export declare class SchemaVersion implements ISchemaVersion {
    readonly major: number;
    readonly minor: number;
    constructor(major: number, minor: number);
    toString(): string;
    equals(other: ISchemaVersion): boolean;
}
export declare class ModelSerializerFactory {
    private static readonly SUPPORTED_VERSIONS;
    private static readonly CURRENT_VERSION;
    /**
     * Creates a serializer for the specified model definition and version.
     * If no version is specified, uses the latest supported version.
     */
    static create(modelDefinition: ModelDefinition, version?: ISchemaVersion): IModelDefinitionSerializer;
    /**
     * Gets the current (latest) supported version.
     */
    static getCurrentVersion(): ISchemaVersion;
    /**
     * Checks if the specified version is supported.
     */
    static isVersionSupported(version: ISchemaVersion): boolean;
    /**
     * Gets all supported versions.
     */
    static getSupportedVersions(): ISchemaVersion[];
    /**
     * Gets a list of supported version strings.
     */
    static getSupportedVersionStrings(): string[];
}
//# sourceMappingURL=ModelSerializerFactory.d.ts.map