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
import { State } from '../types/elements/State';
import { ComponentType } from '../types/elements/ComponentType';
import { StateType } from '../types/elements/StateType';
import { TimePattern } from '../types/elements/TimePattern';
import { TimeDistributedConfig } from '../types/elements/TimeDistributedConfig';

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
import { ISerializedState } from './interfaces/ISerializedState';
import { ISerializedTimePattern } from './interfaces/ISerializedTimePattern';
import { ISerializedTimeDistributedConfig } from './interfaces/ISerializedTimeDistributedConfig';
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
                type: entity.type,
                x: entity.x,
                y: entity.y
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

            // Get all connectors where the sourceId matches the activity's id
            const relevantConnectors = modelDefinition.connectors.getAll()
                .filter(connector => connector.sourceId === activity.id)
                .map(connector => this.serializeConnector(connector));

            const serialized: ISerializedActivity = {
                id: activity.id,
                name: activity.name,
                type: activity.type,
                x: activity.x,
                y: activity.y,
                capacity: activity.capacity,
                inboundQueueCapacity: activity.inboundQueueCapacity,
                outboundQueueCapacity: activity.outboundQueueCapacity,
                operationSteps: activity.operationSteps.map(step =>
                    this.serializeOperationStep(step)
                ),
                connectors: relevantConnectors
            };

            // Add optional properties if they exist
            if (activity.financialProperties) {
                serialized.financialProperties = activity.financialProperties.toJSON();
            }
            if (activity.preProcessingStateModifications && activity.preProcessingStateModifications.length > 0) {
                serialized.preProcessingStateModifications = activity.preProcessingStateModifications.map(m => m.toJSON());
            }
            if (activity.postProcessingStateModifications && activity.postProcessingStateModifications.length > 0) {
                serialized.postProcessingStateModifications = activity.postProcessingStateModifications.map(m => m.toJSON());
            }
            if (activity.connectType) {
                serialized.connectType = activity.connectType;
            }

            return serialized;
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
            return {
                durationPeriodUnit: duration.durationPeriodUnit,
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

            const serialized: ISerializedGenerator = {
                id: generator.id,
                name: generator.name,
                type: generator.type,
                generatorType: generator.generatorType, // NEW field
                x: generator.x,
                y: generator.y,
                activityKeyId: generator.activityKeyId,
                entityId: generator.entityId,
                periodicOccurrences: generator.periodicOccurrences,
                periodIntervalDuration: this.serializeDuration(generator.periodIntervalDuration),
                entitiesPerCreation: generator.entitiesPerCreation,
                periodicStartDuration: this.serializeDuration(generator.periodicStartDuration),
                maxEntities: generator.maxEntities,
                connectors: relevantConnectors
            };

            // Add optional properties if they exist
            if (generator.initialStateModifications && generator.initialStateModifications.length > 0) {
                serialized.initialStateModifications = generator.initialStateModifications.map(m => m.toJSON());
            }

            // Add time distributed config IDs if they exist (for TIME_DISTRIBUTED generators)
            if (generator.timeDistributedConfigIds && generator.timeDistributedConfigIds.length > 0) {
                serialized.timeDistributedConfigIds = generator.timeDistributedConfigIds;
            }

            return serialized;
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

            const serialized: ISerializedResource = {
                id: resource.id,
                name: resource.name,
                type: resource.type,
                x: resource.x,
                y: resource.y,
                capacity: resource.capacity
            };

            // Add optional properties if they exist
            if (resource.financialProperties) {
                serialized.financialProperties = resource.financialProperties.toJSON();
            }

            return serialized;
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
                type: connector.type,
                sourceId: connector.sourceId,
                targetId: connector.targetId,
                sourceX: connector.sourceX,
                sourceY: connector.sourceY,
                targetX: connector.targetX,
                targetY: connector.targetY,
                x: connector.x,  // Midpoint x
                y: connector.y,  // Midpoint y
                weight: connector.weight,
                operationSteps: connector.operationSteps.map(step =>
                    this.serializeOperationStep(step)
                ),
                entityTemplateUniqueId: connector.entityTemplateUniqueId,
                stateCondition: connector.stateCondition?.toJSON(),
                stateModifications: connector.stateModifications.map(m => m.toJSON())
            };
        } catch (error) {
            throw new SerializationError(
                'Connector',
                `Failed to serialize connector ${connector.id}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    protected serializeState(state: State): ISerializedState {
        try {
            if (!state.id || !state.name) {
                throw new InvalidModelError('State must have id and name');
            }

            return {
                id: state.id,
                name: state.name,
                componentType: state.componentType,
                dataType: state.dataType,
                initialValue: state.initialValue,
                categoryValues: state.categoryValues,
                description: state.description,
                collectStatistics: state.collectStatistics
            };
        } catch (error) {
            throw new SerializationError('State', `Failed to serialize state ${state.id}`, error instanceof Error ? error : undefined);
        }
    }

    protected deserializeState(data: ISerializedState): State {
        try {
            if (!data.id || !data.name) {
                throw new InvalidModelError('Serialized state must have id and name');
            }

            return new State(
                data.id,
                data.name,
                data.componentType as ComponentType,
                data.dataType as StateType,
                data.initialValue,
                {
                    categoryValues: data.categoryValues,
                    description: data.description,
                    collectStatistics: data.collectStatistics
                }
            );
        } catch (error) {
            throw new SerializationError('State', `Failed to deserialize state ${data.id}`, error instanceof Error ? error : undefined);
        }
    }

    protected serializeTimePattern(pattern: TimePattern): ISerializedTimePattern {
        try {
            if (!pattern.id || !pattern.name) {
                throw new InvalidModelError('TimePattern must have id and name');
            }

            return {
                unique_id: pattern.id,
                name: pattern.name,
                weeklyWeights: pattern.weeklyWeights.length > 0 ? pattern.weeklyWeights : undefined,
                dayOfWeekWeights: pattern.dayOfWeekWeights.length > 0 ? pattern.dayOfWeekWeights : undefined,
                dayOfWeekHourWeights: pattern.dayOfWeekHourWeights.length > 0 ? pattern.dayOfWeekHourWeights : undefined,
                minuteDistributionDef: this.serializeDuration(pattern.minuteDistribution)
            };
        } catch (error) {
            throw new SerializationError('TimePattern', `Failed to serialize time pattern ${pattern.id}`, error instanceof Error ? error : undefined);
        }
    }

    protected serializeTimeDistributedConfig(config: TimeDistributedConfig): ISerializedTimeDistributedConfig {
        try {
            if (!config.id || !config.name) {
                throw new InvalidModelError('TimeDistributedConfig must have id and name');
            }

            return {
                unique_id: config.id,
                name: config.name,
                timePatternId: config.timePatternId,
                totalVolume: config.totalVolume,
                volumePeriodBasis: config.volumePeriodBasis,
                startDate: config.startDate,
                endDate: config.endDate
            };
        } catch (error) {
            throw new SerializationError('TimeDistributedConfig', `Failed to serialize time distributed config ${config.id}`, error instanceof Error ? error : undefined);
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