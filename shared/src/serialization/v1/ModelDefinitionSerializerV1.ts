import { ModelDefinition } from '../../types/elements/ModelDefinition';
import { BaseModelDefinitionSerializer } from '../BaseModelDefinitionSerializer';
import { ISerializedModel } from '../interfaces/ISerializedModel';
import { ISchemaVersion } from '../interfaces/ISchemaVersion';
import { ISerializedModelV1 } from './interfaces/ISerializedModelV1';
import { SerializationError } from '../errors/SerializationError';

export class ModelDefinitionSerializerV1 extends BaseModelDefinitionSerializer {
    getVersion(): ISchemaVersion {
        return {
            major: 1,
            minor: 0,
            toString(): string {
                return `${this.major}.${this.minor}`;
            }
        };
    }

    private validateV1Specific(modelDefinition: ModelDefinition): void {
        // Add any V1-specific validation rules
    }

    serialize(modelDefinition: ModelDefinition): ISerializedModelV1 {
        try {
            // Validate the model
            this.validateModel(modelDefinition);
            this.validateV1Specific(modelDefinition);

            const metadata = this.getMetadata();

            return {
                formatVersion: '1.0',
                metadata,
                model: this.serializeModel(modelDefinition.model),
                entities: modelDefinition.entities.getAll().map(entity => 
                    this.serializeEntity(entity)
                ),
                activities: modelDefinition.activities.getAll().map(activity => 
                    this.serializeActivity(activity)
                ),
                resources: modelDefinition.resources.getAll().map(resource => 
                    this.serializeResource(resource)
                ),
                generators: modelDefinition.generators.getAll().map(generator => 
                    this.serializeGenerator(generator)
                ),
                resourceRequirements: modelDefinition.resourceRequirements.getAll().map(requirement => 
                    this.serializeResourceRequirement(requirement)
                )
            };
        } catch (error) {
            if (error instanceof SerializationError) {
                throw error;
            }
            throw new SerializationError(
                'Model',
                'Failed to serialize model definition',
                error instanceof Error ? error : undefined
            );
        }
    }
}
