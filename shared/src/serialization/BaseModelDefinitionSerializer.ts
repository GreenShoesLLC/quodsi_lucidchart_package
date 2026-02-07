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
import { State } from '../types/elements/State';
import { ComponentType } from '../types/elements/ComponentType';
import { StateType } from '../types/elements/StateType';
import { TimePattern } from '../types/elements/TimePattern';
import { TimeDistributedConfig } from '../types/elements/TimeDistributedConfig';
import { EntitySourceConfig } from '../types/elements/EntitySourceConfig';
import { StateModification } from '../types/elements/StateModification';
import {
    Action,
    ActionType,
    AssignAction,
    SeizeAction,
    ReleaseAction,
    DelayAction,
    DelayWithResourceAction,
    SplitAction
} from '../types/elements/actions';

import { IModelDefinitionSerializer } from './interfaces/IModelDefinitionSerializer';
import { ISerializedModel } from './interfaces/ISerializedModel';
import { ISerializedActivity } from './interfaces/ISerializedActivity';
import { ISerializedEntity } from './interfaces/ISerializedEntity';
import { ISerializedGenerator } from './interfaces/ISerializedGenerator';
import { ISerializedResource } from './interfaces/ISerializedResource';
import { ISerializedResourceRequirement } from './interfaces/ISerializedResourceRequirement';
import { ISerializedConnector } from './interfaces/ISerializedConnector';
import { ISerializedDuration } from './interfaces/ISerializedDuration';
import { ISerializedRequirementClause } from './interfaces/ISerializedRequirementClause';
import { ISerializedResourceRequest } from './interfaces/ISerializedResourceRequest';
import { ISerializedState } from './interfaces/ISerializedState';
import { ISerializedTimePattern } from './interfaces/ISerializedTimePattern';
import { ISerializedTimeDistributedConfig } from './interfaces/ISerializedTimeDistributedConfig';
import { ISerializedAction } from './interfaces/ISerializedAction';
import { ISerializedEntitySourceConfig } from './interfaces/ISerializedEntitySourceConfig';
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
                description: model.description,
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
                description: entity.description,
                type: entity.type,
                x: entity.x,
                y: entity.y
            };
        } catch (error) {
            throw new SerializationError('Entity', `Failed to serialize entity "${entity.name}" (ID: ${entity.id})`, error instanceof Error ? error : undefined);
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
                description: activity.description,
                type: activity.type,
                x: activity.x,
                y: activity.y,
                capacity: activity.capacity,
                inboundQueueCapacity: activity.inboundQueueCapacity,
                outboundQueueCapacity: activity.outboundQueueCapacity,
                actions: activity.actions.map(action =>
                    this.serializeAction(action)
                ),
                connectors: relevantConnectors
            };

            // NEW: Serialize sourceConfig if present (self-generating activity)
            if (activity.sourceConfig) {
                serialized.sourceConfig = this.serializeEntitySourceConfig(activity.sourceConfig);
            }

            // Add optional properties if they exist
            if (activity.financialProperties) {
                serialized.financialProperties = activity.financialProperties.toJSON();
            }
            if (activity.connectType) {
                serialized.connectType = activity.connectType;
            }

            return serialized;
        } catch (error) {
            throw new SerializationError(
                'Activity',
                `Failed to serialize activity "${activity.name}" (ID: ${activity.id})`,
                error instanceof Error ? error : undefined
            );
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

            if (!generator.generationConfig) {
                throw new InvalidModelError('Generator must have generationConfig');
            }

            // Compute exitConnector dynamically from connectors
            // This ensures it always reflects the current diagram state
            const outgoingConnector = modelDefinition.connectors.getAll()
                .find(c => c.sourceId === generator.id);

            const serialized: ISerializedGenerator = {
                id: generator.id,
                name: generator.name,
                description: generator.description,
                type: generator.type,
                x: generator.x,
                y: generator.y,
                generationConfig: this.serializeEntitySourceConfig(generator.generationConfig)
            };

            // Set exitConnector from actual connector (not stored value)
            if (outgoingConnector) {
                serialized.exitConnector = outgoingConnector.targetId;
            }

            return serialized;
        } catch (error) {
            throw new SerializationError(
                'Generator',
                `Failed to serialize generator "${generator.name}" (ID: ${generator.id})`,
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
                description: resource.description,
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
            throw new SerializationError('Resource', `Failed to serialize resource "${resource.name}" (ID: ${resource.id})`, error instanceof Error ? error : undefined);
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
            if (!connector.id || !connector.sourceId) {
                throw new InvalidModelError('Connector must have id and sourceId');
            }

            // Get effective destination (new field or legacy targetId)
            const effectiveDestination = connector.getEffectiveDestinationUniqueId();
            if (!effectiveDestination) {
                throw new InvalidModelError('Connector must have destinationUniqueId or targetId');
            }

            const serialized: ISerializedConnector = {
                id: connector.id,
                name: connector.name,
                description: connector.description,
                type: connector.type,
                sourceId: connector.sourceId,
                targetId: connector.targetId, // Legacy field
                sourceX: connector.sourceX,
                sourceY: connector.sourceY,
                targetX: connector.targetX,
                targetY: connector.targetY,
                x: connector.x,  // Midpoint x
                y: connector.y,  // Midpoint y
                weight: connector.weight,
                actions: connector.actions.map(action =>
                    this.serializeAction(action)
                ),
                entityTemplateUniqueId: connector.entityTemplateUniqueId,
                stateCondition: connector.stateCondition?.toJSON(),
                stateModifications: connector.stateModifications.map(m => this.serializeModification(m))
            };

            // NEW: Serialize destinationUniqueId if present
            if (connector.destinationUniqueId) {
                serialized.destinationUniqueId = connector.destinationUniqueId;
            }

            // NEW: Serialize destinationPriority if present
            if (connector.destinationPriority !== undefined) {
                serialized.destinationPriority = connector.destinationPriority;
            }

            return serialized;
        } catch (error) {
            throw new SerializationError(
                'Connector',
                `Failed to serialize connector "${connector.name}" (ID: ${connector.id})`,
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

    /**
     * Safely serialize a StateModification, handling both class instances and plain objects.
     * This provides a safety net for cases where modifications were loaded from storage
     * as plain objects without being hydrated back to StateModification instances.
     */
    private serializeModification(m: StateModification | object): object {
        if (typeof (m as any).toJSON === 'function') {
            return (m as StateModification).toJSON();
        }
        // Already a plain object, return as-is
        return m;
    }

    protected serializeAction(action: Action): ISerializedAction {
        try {
            switch (action.actionType) {
                case ActionType.ASSIGN:
                    return {
                        actionType: ActionType.ASSIGN,
                        modifications: (action as AssignAction).modifications.map(m => this.serializeModification(m))
                    };

                case ActionType.SEIZE:
                    return {
                        actionType: ActionType.SEIZE,
                        resourceRequirementId: (action as SeizeAction).resourceRequirementId
                    };

                case ActionType.RELEASE:
                    return {
                        actionType: ActionType.RELEASE,
                        resourceRequirementId: (action as ReleaseAction).resourceRequirementId
                    };

                case ActionType.DELAY:
                    return {
                        actionType: ActionType.DELAY,
                        duration: this.serializeDuration((action as DelayAction).duration)
                    };

                case ActionType.DELAY_WITH_RESOURCE: {
                    const delayWithResource = action as DelayWithResourceAction;
                    const serialized: ISerializedAction = {
                        actionType: ActionType.DELAY_WITH_RESOURCE,
                        resourceRequirementId: delayWithResource.resourceRequirementId,
                        duration: this.serializeDuration(delayWithResource.duration)
                    };

                    if (delayWithResource.keepResource !== undefined) {
                        serialized.keepResource = delayWithResource.keepResource;
                    }

                    if (delayWithResource.stateModifications && delayWithResource.stateModifications.length > 0) {
                        serialized.stateModifications = delayWithResource.stateModifications.map(m => this.serializeModification(m));
                    }

                    return serialized;
                }

                case ActionType.SPLIT: {
                    const splitAction = action as SplitAction;
                    return {
                        actionType: ActionType.SPLIT,
                        count: splitAction.count,
                        entityTemplateId: splitAction.entityTemplateId,
                        destinationId: splitAction.destinationId,
                        inheritStates: splitAction.inheritStates,
                        modifications: splitAction.modifications.map(m => this.serializeModification(m)),
                        splitIndexState: splitAction.splitIndexState
                    };
                }

                default:
                    throw new InvalidModelError(`Unknown action type: ${(action as Action).actionType}`);
            }
        } catch (error) {
            throw new SerializationError('Action', 'Failed to serialize action', error instanceof Error ? error : undefined);
        }
    }

    protected serializeEntitySourceConfig(config: EntitySourceConfig): ISerializedEntitySourceConfig {
        try {
            if (!config.entityId) {
                throw new InvalidModelError('EntitySourceConfig must have entityId');
            }

            const serialized: ISerializedEntitySourceConfig = {
                entityId: config.entityId,
                generatorType: config.generatorType
            };

            // FREQUENCY mode fields
            if (config.periodicOccurrences !== undefined) {
                serialized.periodicOccurrences = config.periodicOccurrences;
            }
            if (config.periodIntervalDuration) {
                serialized.periodIntervalDuration = this.serializeDuration(config.periodIntervalDuration);
            }
            if (config.entitiesPerCreation !== undefined) {
                serialized.entitiesPerCreation = config.entitiesPerCreation;
            }
            if (config.periodicStartDuration) {
                serialized.periodicStartDuration = this.serializeDuration(config.periodicStartDuration);
            }
            if (config.maxEntities !== undefined) {
                serialized.maxEntities = config.maxEntities;
            }

            // TIME_DISTRIBUTED mode fields
            if (config.timeDistributedConfigIds && config.timeDistributedConfigIds.length > 0) {
                serialized.timeDistributedConfigIds = config.timeDistributedConfigIds;
            }

            // State initialization
            if (config.initialStateModifications && config.initialStateModifications.length > 0) {
                serialized.initialStateModifications = config.initialStateModifications.map(m => this.serializeModification(m));
            }

            return serialized;
        } catch (error) {
            throw new SerializationError('EntitySourceConfig', 'Failed to serialize entity source config', error instanceof Error ? error : undefined);
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