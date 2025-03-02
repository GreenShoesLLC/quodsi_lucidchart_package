import { EditorClient, CollectionProxy, MapProxy, DataItemProxy } from 'lucid-extension-sdk';
import { DataSourceReader } from '../base/DataSourceReader';
import { MODEL_COLLECTIONS } from './schemas';
import { SimulationObjectType } from '@quodsi/shared';

// Define interfaces for the model data
export interface ModelData {
  id: string;
  name: string;
  reps: number;
  forecastDays: number;
  seed: number;
  oneClockUnit: string;
  simulationTimeType: string;
  warmupClockPeriod: number;
  warmupClockPeriodUnit: string;
  runClockPeriod: number;
  runClockPeriodUnit: string;
  warmupDateTime: string;
  startDateTime: string;
  finishDateTime: string;
  type: string;
}

export interface ActivityData {
  id: string;
  name: string;
  capacity: number;
  inputBufferCapacity: number;
  outputBufferCapacity: number;
  type: string;
}

export interface ResourceData {
  id: string;
  name: string;
  capacity: number;
  type: string;
}

export interface EntityData {
  id: string;
  name: string;
  type: string;
}

export interface GeneratorData {
  id: string;
  name: string;
  entityId: string;
  creationMode: string;
  quantity: number;
  timeBetweenArrivals: string;
  maxBatches: number;
  type: string;
}

export interface ConnectorData {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  type: string;
}

export interface OperationStepData {
  id: string;
  activityId: string;
  requirementId?: string;
  duration: string;
  quantity: number;
}

export interface ResourceRequirementData {
  id: string;
  name: string;
  type: string;
}

export interface RequirementClauseData {
  id: string;
  mode: string;
  requirementId: string;
}

export interface ResourceRequestData {
  id: string;
  resourceId: string;
  quantity: number;
  priority: number;
  keepResource: boolean;
  clauseId: string;
}

/**
 * A class for reading Quodsi model data from LucidChart documents
 */
export class ModelReader extends DataSourceReader {
  /**
   * Creates a new ModelReader instance
   * @param client The EditorClient instance
   * @param modelId Optional model ID to specify which model to read
   */
  constructor(client: EditorClient, private modelId?: string) {
    super(client, modelId ? `model_${modelId}` : '');
  }

  /**
   * Sets the model ID to read
   * @param modelId The model ID
   */
  setModelId(modelId: string): void {
    this.dataSourceName = `model_${modelId}`;
    this.modelId = modelId;
  }

  /**
   * Gets the current model ID
   * @returns The current model ID or undefined if not set
   */
  getModelId(): string | undefined {
    return this.modelId;
  }

  /**
   * Checks if the model data source exists
   * @returns True if the model data source exists, false otherwise
   */
  async hasModelDataSource(): Promise<boolean> {
    if (!this.modelId) return false;
    const dataSource = this.getDataSource();
    return dataSource !== null;
  }

  /**
   * Gets model data
   * @returns Array of model data or empty array if not found
   */
  async getModelData(): Promise<ModelData[]> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.MODEL);
    if (!collection) return [];
    
    const result: ModelData[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(this.mapToModelData(item));
      }
    }
    
    return result;
  }

  /**
   * Gets all activities in the model
   * @returns Array of activity data or empty array if not found
   */
  async getActivities(): Promise<ActivityData[]> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.ACTIVITIES);
    if (!collection) return [];
    
    const result: ActivityData[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(this.mapToActivityData(item));
      }
    }
    
    return result;
  }

  /**
   * Gets a specific activity by ID
   * @param id The activity ID
   * @returns The activity data or null if not found
   */
  async getActivity(id: string): Promise<ActivityData | null> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.ACTIVITIES);
    if (!collection) return null;
    
    const item = collection.items.get(id);
    if (!item) return null;
    
    return this.mapToActivityData(item);
  }

  /**
   * Gets all resources in the model
   * @returns Array of resource data or empty array if not found
   */
  async getResources(): Promise<ResourceData[]> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.RESOURCES);
    if (!collection) return [];
    
    const result: ResourceData[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(this.mapToResourceData(item));
      }
    }
    
    return result;
  }

  /**
   * Gets all entities in the model
   * @returns Array of entity data or empty array if not found
   */
  async getEntities(): Promise<EntityData[]> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.ENTITIES);
    if (!collection) return [];
    
    const result: EntityData[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(this.mapToEntityData(item));
      }
    }
    
    return result;
  }

  /**
   * Gets all generators in the model
   * @returns Array of generator data or empty array if not found
   */
  async getGenerators(): Promise<GeneratorData[]> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.GENERATORS);
    if (!collection) return [];
    
    const result: GeneratorData[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(this.mapToGeneratorData(item));
      }
    }
    
    return result;
  }

  /**
   * Gets all connectors in the model
   * @returns Array of connector data or empty array if not found
   */
  async getConnectors(): Promise<ConnectorData[]> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.CONNECTORS);
    if (!collection) return [];
    
    const result: ConnectorData[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(this.mapToConnectorData(item));
      }
    }
    
    return result;
  }

  /**
   * Gets all operation steps in the model
   * @returns Array of operation step data or empty array if not found
   */
  async getOperationSteps(): Promise<OperationStepData[]> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.OPERATION_STEPS);
    if (!collection) return [];
    
    const result: OperationStepData[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(this.mapToOperationStepData(item));
      }
    }
    
    return result;
  }

  /**
   * Gets all resource requirements in the model
   * @returns Array of resource requirement data or empty array if not found
   */
  async getResourceRequirements(): Promise<ResourceRequirementData[]> {
    const collection = await this.getCollectionByName(MODEL_COLLECTIONS.RESOURCE_REQUIREMENTS);
    if (!collection) return [];
    
    const result: ResourceRequirementData[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(this.mapToResourceRequirementData(item));
      }
    }
    
    return result;
  }

  /**
   * Gets all connectors that have a specific activity as source
   * @param activityId The activity ID
   * @returns Array of connectors or empty array if none found
   */
  async getOutgoingConnectors(activityId: string): Promise<ConnectorData[]> {
    const allConnectors = await this.getConnectors();
    return allConnectors.filter(connector => connector.sourceId === activityId);
  }

  /**
   * Gets all connectors that have a specific activity as target
   * @param activityId The activity ID
   * @returns Array of connectors or empty array if none found
   */
  async getIncomingConnectors(activityId: string): Promise<ConnectorData[]> {
    const allConnectors = await this.getConnectors();
    return allConnectors.filter(connector => connector.targetId === activityId);
  }

  /**
   * Gets all operation steps for a specific activity
   * @param activityId The activity ID
   * @returns Array of operation steps or empty array if none found
   */
  async getActivityOperationSteps(activityId: string): Promise<OperationStepData[]> {
    const allSteps = await this.getOperationSteps();
    return allSteps.filter(step => step.activityId === activityId);
  }

  // Helper methods to map from DataItemProxy to strongly-typed objects

  private mapToModelData(item: DataItemProxy): ModelData {
    return {
      id: item.fields.get('id') as string,
      name: item.fields.get('name') as string,
      reps: item.fields.get('reps') as number,
      forecastDays: item.fields.get('forecastDays') as number,
      seed: item.fields.get('seed') as number,
      oneClockUnit: item.fields.get('oneClockUnit') as string,
      simulationTimeType: item.fields.get('simulationTimeType') as string,
      warmupClockPeriod: item.fields.get('warmupClockPeriod') as number,
      warmupClockPeriodUnit: item.fields.get('warmupClockPeriodUnit') as string,
      runClockPeriod: item.fields.get('runClockPeriod') as number,
      runClockPeriodUnit: item.fields.get('runClockPeriodUnit') as string,
      warmupDateTime: item.fields.get('warmupDateTime') as string,
      startDateTime: item.fields.get('startDateTime') as string,
      finishDateTime: item.fields.get('finishDateTime') as string,
      type: item.fields.get('type') as string
    };
  }

  private mapToActivityData(item: DataItemProxy): ActivityData {
    return {
      id: item.fields.get('id') as string,
      name: item.fields.get('name') as string,
      capacity: item.fields.get('capacity') as number,
      inputBufferCapacity: item.fields.get('inputBufferCapacity') as number,
      outputBufferCapacity: item.fields.get('outputBufferCapacity') as number,
      type: item.fields.get('type') as string
    };
  }

  private mapToResourceData(item: DataItemProxy): ResourceData {
    return {
      id: item.fields.get('id') as string,
      name: item.fields.get('name') as string,
      capacity: item.fields.get('capacity') as number,
      type: item.fields.get('type') as string
    };
  }

  private mapToEntityData(item: DataItemProxy): EntityData {
    return {
      id: item.fields.get('id') as string,
      name: item.fields.get('name') as string,
      type: item.fields.get('type') as string
    };
  }

  private mapToGeneratorData(item: DataItemProxy): GeneratorData {
    return {
      id: item.fields.get('id') as string,
      name: item.fields.get('name') as string,
      entityId: item.fields.get('entityId') as string,
      creationMode: item.fields.get('creationMode') as string,
      quantity: item.fields.get('quantity') as number,
      timeBetweenArrivals: item.fields.get('timeBetweenArrivals') as string,
      maxBatches: item.fields.get('maxBatches') as number,
      type: item.fields.get('type') as string
    };
  }

  private mapToConnectorData(item: DataItemProxy): ConnectorData {
    return {
      id: item.fields.get('id') as string,
      name: item.fields.get('name') as string,
      sourceId: item.fields.get('sourceId') as string,
      targetId: item.fields.get('targetId') as string,
      type: item.fields.get('type') as string
    };
  }

  private mapToOperationStepData(item: DataItemProxy): OperationStepData {
    return {
      id: item.fields.get('id') as string,
      activityId: item.fields.get('activityId') as string,
      requirementId: item.fields.get('requirementId') as string | undefined,
      duration: item.fields.get('duration') as string,
      quantity: item.fields.get('quantity') as number
    };
  }

  private mapToResourceRequirementData(item: DataItemProxy): ResourceRequirementData {
    return {
      id: item.fields.get('id') as string,
      name: item.fields.get('name') as string,
      type: item.fields.get('type') as string
    };
  }
}
