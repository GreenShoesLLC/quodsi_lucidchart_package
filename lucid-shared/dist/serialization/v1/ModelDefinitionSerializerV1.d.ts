import { ModelDefinition } from '../../types/elements/ModelDefinition';
import { BaseModelDefinitionSerializer } from '../BaseModelDefinitionSerializer';
import { ISchemaVersion } from '../interfaces/ISchemaVersion';
import { ISerializedModelV1 } from './interfaces/ISerializedModelV1';
export declare class ModelDefinitionSerializerV1 extends BaseModelDefinitionSerializer {
    getVersion(): ISchemaVersion;
    private validateV1Specific;
    serialize(modelDefinition: ModelDefinition): ISerializedModelV1;
}
//# sourceMappingURL=ModelDefinitionSerializerV1.d.ts.map