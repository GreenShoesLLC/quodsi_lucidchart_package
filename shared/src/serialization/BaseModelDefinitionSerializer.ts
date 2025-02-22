import { ModelDefinition } from '../types/elements/ModelDefinition';
import { Activity } from '../types/elements/Activity';
import { Entity } from '../types/elements/Entity';
import { Generator } from '../types/elements/Generator';
import { Resource } from '../types/elements/Resource';
import { ResourceRequirement } from '../types/elements/ResourceRequirement';
import { Model } from '../types/elements/Model';
import { Connector } from '../types/elements/Connector';
import { Duration } from '../types/elements/Duration';
import { RequirementClause } from '../types/elements/RequirementClause';
import { ResourceRequest } from '../types/elements/ResourceRequest';
import { OperationStep } from '../types/elements/OperationStep';

import { IModelDefinitionSerializer } from './interfaces/IModelDefinitionSerializer';
import { ISerializedModel } from './interfaces/ISerializedModel';
import { ISerializedActivity } from './interfaces/ISerializedActivity';
import { ISerializedEntity } from './interfaces/ISerializedEntity';
import { ISerializedGenerator } from './interfaces/ISerializedGenerator';
import { ISerializedResource } from './interfaces/ISerializedResource';
import { ISerializedResourceRequirement } from './interfaces/ISerializedResourceRequirement';
import { ISerializedConnector } from './interfaces/ISerializedConnector';
import { ISerializedDuration } from './interfaces/ISerializedDuration';
import { ISerializedOperationStep } from './interfaces/ISerializedOperationStep';
import { ISerializedRequirementClause } from './interfaces/ISerializedRequirementClause';
import { ISerializedResourceRequest } from './interfaces/ISerializedResourceRequest';
import { ISchemaVersion } from './interfaces/ISchemaVersion';
import { SerializationError } from './errors/SerializationError';
import { InvalidModelError } from './errors/InvalidModelError';

export abstract class BaseModelDefinitionSerializer implements IModelDefinitionSerializer {
    abstract getVersion(): ISchemaVersion;

    abstract serialize(modelDefinition: ModelDefinition): ISerializedModel;

    protected validateModel(modelDefinition: ModelDefinition): void {
        if (!modelDefinition) {
            throw new InvalidModelError('ModelDefinition cannot be null or undefined');
        }

        if (!modelDefinition.model) {
            throw new InvalidModelError('Model is required');
        }

        if (!modelDefinition.entities.getAll().length) {
            throw new InvalidModelError('At least one entity is required');
        }
    }

    protected serializeModel(model: Model) {
        try {
            if (!model.id || !model.name) {
                throw new InvalidModelError('Model must have id and name');
            }

            return {
                id: model.id,
                name: model.name,
                reps: model.reps,
                forecastDays: model.forecastDays,
                seed: model.seed,
                oneClockUnit: model.oneClockUnit,
                simulationTimeType: model.simulationTimeType,
                warmupClockPeriod: model.warmupClockPeriod,
                warmupClockPeriodUnit: model.warmupClockPeriodUnit,
                runClockPeriod: model.runClockPeriod,
                runClockPeriodUnit: model.runClockPeriodUnit,
                warmupDateTime: model.warmupDateTime?.toISOString() ?? null,
                startDateTime: model.startDateTime?.toISOString() ?? null,
                finishDateTime: model.finishDateTime?.toISOString() ?? null
            };
        } catch (error) {
            throw new SerializationError('Model', 'Failed to serialize model properties', error instanceof Error ? error : undefined);
        }
    }

    protected serializeEntity(entity: Entity): ISerializedEntity {
        try {
            if (!entity.id || !entity.name) {
                throw new InvalidModelError('Entity must have id and name');
            }

            return {
                id: entity.id,
                name: entity.name,
                type: entity.type
            };
        } catch (error) {
            throw new SerializationError('Entity', `Failed to serialize entity ${entity.id}`, error instanceof Error ? error : undefined);
        }
    }

    protected serializeActivity(activity: Activity, modelDefinition: ModelDefinition): ISerializedActivity {
        try {
            if (!activity.id || !activity.name) {
                throw new InvalidModelError('Activity must have id and name');
            }
            console.log("[BaseModelDefinitionSerializer]: # of Connectors", modelDefinition.connectors.size())
            // Get all connectors where the sourceId matches the activity's id
            const relevantConnectors = modelDefinition.connectors.getAll()
                .filter(connector => {
                    // Log values for debugging
                    console.log(`[BaseModelDefinitionSerializer]: Comparing connector.sourceId: ${connector.sourceId} with activity.id: ${activity.id}`);
                    return connector.sourceId === activity.id;
                })
                .map(connector => this.serializeConnector(connector));

            if (relevantConnectors.length > 0)
            {
                console.log("[BaseModelDefinitionSerializer]: # of Activity Connectors", relevantConnectors.length)
            }
            else{
                console.log("[BaseModelDefinitionSerializer]: # of Activity Connectors", 0)
            }
            

            return {
                id: activity.id,
                name: activity.name,
                type: activity.type,
                capacity: activity.capacity,
                inputBufferCapacity: activity.inputBufferCapacity,
                outputBufferCapacity: activity.outputBufferCapacity,
                operationSteps: activity.operationSteps.map(step =>
                    this.serializeOperationStep(step)
                ),
                connectors: relevantConnectors
            };
        } catch (error) {
            throw new SerializationError(
                'Activity',
                `Failed to serialize activity ${activity.id}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    protected serializeOperationStep(step: OperationStep): ISerializedOperationStep {
        try {
            if (!step || !step.duration) {
                throw new InvalidModelError('OperationStep must have a duration');
            }

            return {
                duration: this.serializeDuration(step.duration),
                requirementId: step.requirementId,
                quantity: step.quantity
            };
        } catch (error) {
            throw new SerializationError('OperationStep', 'Failed to serialize operation step', error instanceof Error ? error : undefined);
        }
    }

    protected serializeDuration(duration: Duration): ISerializedDuration {
        try {
            if (duration.durationLength < 0) {
                throw new InvalidModelError('Duration length cannot be negative');
            }

            return {
                durationLength: duration.durationLength,
                durationPeriodUnit: duration.durationPeriodUnit,
                durationType: duration.durationType,
                distribution: duration.distribution
            };
        } catch (error) {
            throw new SerializationError('Duration', 'Failed to serialize duration', error instanceof Error ? error : undefined);
        }
    }

    protected serializeGenerator(generator: Generator, modelDefinition: ModelDefinition): ISerializedGenerator {
        try {
            if (!generator.id || !generator.name) {
                throw new InvalidModelError('Generator must have id and name');
            }

            // Get all connectors where the sourceId matches the generator's id
            const relevantConnectors = modelDefinition.connectors.getAll()
                .filter(connector => connector.sourceId === generator.id)
                .map(connector => this.serializeConnector(connector));

            return {
                id: generator.id,
                name: generator.name,
                type: generator.type,
                activityKeyId: generator.activityKeyId,
                entityId: generator.entityId,
                periodicOccurrences: generator.periodicOccurrences,
                periodIntervalDuration: this.serializeDuration(generator.periodIntervalDuration),
                entitiesPerCreation: generator.entitiesPerCreation,
                periodicStartDuration: this.serializeDuration(generator.periodicStartDuration),
                maxEntities: generator.maxEntities,
                connectors: relevantConnectors
            };
        } catch (error) {
            throw new SerializationError(
                'Generator',
                `Failed to serialize generator ${generator.id}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    protected serializeResource(resource: Resource): ISerializedResource {
        try {
            if (!resource.id || !resource.name) {
                throw new InvalidModelError('Resource must have id and name');
            }

            return {
                id: resource.id,
                name: resource.name,
                type: resource.type,
                capacity: resource.capacity
            };
        } catch (error) {
            throw new SerializationError('Resource', `Failed to serialize resource ${resource.id}`, error instanceof Error ? error : undefined);
        }
    }

    protected serializeResourceRequirement(requirement: ResourceRequirement): ISerializedResourceRequirement {
        try {
            if (!requirement.id || !requirement.name) {
                throw new InvalidModelError('ResourceRequirement must have id and name');
            }

            return {
                id: requirement.id,
                name: requirement.name,
                type: requirement.type,
                rootClauses: requirement.rootClauses.map(clause => this.serializeRequirementClause(clause))
            };
        } catch (error) {
            throw new SerializationError('ResourceRequirement', `Failed to serialize resource requirement ${requirement.id}`, error instanceof Error ? error : undefined);
        }
    }

    protected serializeRequirementClause(clause: RequirementClause): ISerializedRequirementClause {
        try {
            if (!clause.clauseId) {
                throw new InvalidModelError('RequirementClause must have a clauseId');
            }

            return {
                clauseId: clause.clauseId,
                mode: clause.mode,
                parentClauseId: clause.parentClauseId,
                requests: clause.requests.map(request => this.serializeResourceRequest(request)),
                subClauses: clause.subClauses.map(subClause => this.serializeRequirementClause(subClause))
            };
        } catch (error) {
            throw new SerializationError('RequirementClause', `Failed to serialize requirement clause ${clause.clauseId}`, error instanceof Error ? error : undefined);
        }
    }

    protected serializeResourceRequest(request: ResourceRequest): ISerializedResourceRequest {
        try {
            if (!request.resourceId) {
                throw new InvalidModelError('ResourceRequest must have a resourceId');
            }

            return {
                resourceId: request.resourceId,
                quantity: request.quantity,
                priority: request.priority,
                keepResource: request.keepResource
            };
        } catch (error) {
            throw new SerializationError('ResourceRequest', `Failed to serialize resource request for resource ${request.resourceId}`, error instanceof Error ? error : undefined);
        }
    }

    protected serializeConnector(connector: Connector): ISerializedConnector {
        try {
            if (!connector.id || !connector.sourceId || !connector.targetId) {
                throw new InvalidModelError('Connector must have id, sourceId, and targetId');
            }

            return {
                id: connector.id,
                name: connector.name,
                sourceId: connector.sourceId,
                targetId: connector.targetId,
                type: connector.type,
                probability: connector.probability,
                connectType: connector.connectType,
                operationSteps: connector.operationSteps.map(step =>
                    this.serializeOperationStep(step)
                )
            };
        } catch (error) {
            throw new SerializationError(
                'Connector',
                `Failed to serialize connector ${connector.id}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    protected getMetadata(): { version: string; timestamp: string } {
        try {
            return {
                version: this.getVersion().toString(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new SerializationError('Metadata', 'Failed to generate metadata', error instanceof Error ? error : undefined);
        }
    }
}