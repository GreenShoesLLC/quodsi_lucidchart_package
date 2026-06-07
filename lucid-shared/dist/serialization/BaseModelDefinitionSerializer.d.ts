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
import { TimePattern } from '../types/elements/TimePattern';
import { TimeDistributedConfig } from '../types/elements/TimeDistributedConfig';
import { EntitySourceConfig } from '../types/elements/EntitySourceConfig';
import { Action } from '../types/elements/actions';
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
export declare abstract class BaseModelDefinitionSerializer implements IModelDefinitionSerializer {
    abstract getVersion(): ISchemaVersion;
    abstract serialize(modelDefinition: ModelDefinition): ISerializedModel;
    protected validateModel(modelDefinition: ModelDefinition): void;
    protected serializeModel(model: Model): {
        id: string;
        name: string;
        description: string;
        reps: number;
        seed: number | undefined;
        oneClockUnit: import("..").PeriodUnit | undefined;
        simulationTimeType: import("..").SimulationTimeType | undefined;
        warmupClockPeriod: number | undefined;
        warmupClockPeriodUnit: import("..").PeriodUnit | undefined;
        runClockPeriod: number | undefined;
        runClockPeriodUnit: import("..").PeriodUnit | undefined;
        warmupDateTime: string | null;
        startDateTime: string | null;
        finishDateTime: string | null;
    };
    protected serializeEntity(entity: Entity): ISerializedEntity;
    protected serializeActivity(activity: Activity, modelDefinition: ModelDefinition): ISerializedActivity;
    protected serializeDuration(duration: Duration): ISerializedDuration;
    protected serializeGenerator(generator: Generator, modelDefinition: ModelDefinition): ISerializedGenerator;
    protected serializeResource(resource: Resource): ISerializedResource;
    protected serializeResourceRequirement(requirement: ResourceRequirement): ISerializedResourceRequirement;
    protected serializeRequirementClause(clause: RequirementClause): ISerializedRequirementClause;
    protected serializeResourceRequest(request: ResourceRequest): ISerializedResourceRequest;
    protected serializeConnector(connector: Connector): ISerializedConnector;
    protected serializeState(state: State): ISerializedState;
    protected deserializeState(data: ISerializedState): State;
    protected serializeTimePattern(pattern: TimePattern): ISerializedTimePattern;
    protected serializeTimeDistributedConfig(config: TimeDistributedConfig): ISerializedTimeDistributedConfig;
    /**
     * Safely serialize a StateModification, handling both class instances and plain objects.
     * This provides a safety net for cases where modifications were loaded from storage
     * as plain objects without being hydrated back to StateModification instances.
     */
    private serializeModification;
    protected serializeAction(action: Action): ISerializedAction;
    protected serializeEntitySourceConfig(config: EntitySourceConfig): ISerializedEntitySourceConfig;
    protected getMetadata(): {
        version: string;
        timestamp: string;
    };
}
//# sourceMappingURL=BaseModelDefinitionSerializer.d.ts.map