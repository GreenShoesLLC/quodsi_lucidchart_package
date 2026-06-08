import { ModelDefinition } from '@quodsi/shared';
import { ISchemaVersion } from './ISchemaVersion';
import { ISerializedModel } from './ISerializedModel';

export interface IModelDefinitionSerializer {
    serialize(modelDefinition: ModelDefinition): ISerializedModel;
    getVersion(): ISchemaVersion;
}
