import { ModelDefinition } from '../../types/elements/ModelDefinition';
import { ISchemaVersion } from './ISchemaVersion';
import { ISerializedModel } from './ISerializedModel';

export interface IModelDefinitionSerializer {
    serialize(modelDefinition: ModelDefinition): ISerializedModel;
    getVersion(): ISchemaVersion;
}
