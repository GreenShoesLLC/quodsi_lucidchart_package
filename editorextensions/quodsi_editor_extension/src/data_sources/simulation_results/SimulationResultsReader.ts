import { EditorClient, CollectionProxy, MapProxy, DataItemProxy } from 'lucid-extension-sdk';
import { DataSourceReader } from '../base/DataSourceReader';
import { 
  ModelData, mapToModelData,
  ActivityUtilization, mapToActivityUtilization,
  ActivityRepSummary, mapToActivityRepSummary,
  ActivityTiming, mapToActivityTiming,
  EntityStateRepSummary, mapToEntityStateRepSummary,
  EntityThroughputRepSummary, mapToEntityThroughputRepSummary,
  ResourceRepSummary, mapToResourceRepSummary,
  ResourceUtilization, mapToResourceUtilization,
  EntityStateCrossRepSummary, mapToEntityStateCrossRepSummary,
  EntityThroughputCrossRepSummary, mapToEntityThroughputCrossRepSummary
} from './models';

/**
 * Reader for the simulation_results data source
 * Provides methods for accessing simulation results data in LucidChart
 */
export class SimulationResultsReader extends DataSourceReader {
  constructor(client: EditorClient) {
    super(client, 'simulation_results');
  }
  
  /**
   * Gets the model data for a specific page
   * @param pageId ID of the page to get model data for
   * @returns The model data for the page if found, null otherwise
   */
  async getModelDataForPage(pageId: string): Promise<ModelData | null> {
    const modelsCollection = await this.getCollectionByName('Models');
    if (!modelsCollection) return null;
    
    // Try to find the model data for the specified page ID
    const modelItem = modelsCollection.items.get(`"${pageId}"`);
    if (!modelItem) return null;
    
    return mapToModelData(modelItem.fields);
  }
  
  /**
   * Gets activity utilization data collection
   * @returns The activity utilization collection if found, null otherwise
   */
  async getActivityUtilizationCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('activity_utilization');
  }

  /**
   * Gets activity utilization data as strongly typed objects
   * @returns Array of ActivityUtilization objects
   */
  async getActivityUtilizationData(): Promise<ActivityUtilization[]> {
    const collection = await this.getActivityUtilizationCollection();
    if (!collection) return [];
    
    const result: ActivityUtilization[] = [];
    
    // Use for...of directly on the items MapProxy
    // This works because MapProxy implements Symbol.iterator
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToActivityUtilization(item.fields));
      }
    }
    
    return result;
  }
  
  /**
   * Gets activity replication summary collection
   * @returns The activity replication summary collection if found, null otherwise
   */
  async getActivityRepSummaryCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('activity_rep_summary');
  }
  
  /**
   * Gets activity replication summary data as strongly typed objects
   * @returns Array of ActivityRepSummary objects
   */
  async getActivityRepSummaryData(): Promise<ActivityRepSummary[]> {
    const collection = await this.getActivityRepSummaryCollection();
    if (!collection) return [];
    
    const result: ActivityRepSummary[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToActivityRepSummary(item.fields));
      }
    }
    
    return result;
  }
  
  /**
   * Gets activity timing collection
   * @returns The activity timing collection if found, null otherwise
   */
  async getActivityTimingCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('activity_timing');
  }
  
  /**
   * Gets activity timing data as strongly typed objects
   * @returns Array of ActivityTiming objects
   */
  async getActivityTimingData(): Promise<ActivityTiming[]> {
    const collection = await this.getActivityTimingCollection();
    if (!collection) return [];
    
    const result: ActivityTiming[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToActivityTiming(item.fields));
      }
    }
    
    return result;
  }
  
  /**
   * Gets entity state replication summary collection
   * @returns The entity state replication summary collection if found, null otherwise
   */
  async getEntityStateRepSummaryCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('entity_state_rep_summary');
  }
  
  /**
   * Gets entity state replication summary data as strongly typed objects
   * @returns Array of EntityStateRepSummary objects
   */
  async getEntityStateRepSummaryData(): Promise<EntityStateRepSummary[]> {
    const collection = await this.getEntityStateRepSummaryCollection();
    if (!collection) return [];
    
    const result: EntityStateRepSummary[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToEntityStateRepSummary(item.fields));
      }
    }
    
    return result;
  }
  
  /**
   * Gets entity throughput replication summary collection
   * @returns The entity throughput replication summary collection if found, null otherwise
   */
  async getEntityThroughputRepSummaryCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('entity_throughput_rep_summary');
  }
  
  /**
   * Gets entity throughput replication summary data as strongly typed objects
   * @returns Array of EntityThroughputRepSummary objects
   */
  async getEntityThroughputRepSummaryData(): Promise<EntityThroughputRepSummary[]> {
    const collection = await this.getEntityThroughputRepSummaryCollection();
    if (!collection) return [];
    
    const result: EntityThroughputRepSummary[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToEntityThroughputRepSummary(item.fields));
      }
    }
    
    return result;
  }
  
  /**
   * Gets resource utilization collection
   * @returns The resource utilization collection if found, null otherwise
   */
  async getResourceUtilizationCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('resource_utilization');
  }
  
  /**
   * Gets resource utilization data as strongly typed objects
   * @returns Array of ResourceUtilization objects
   */
  async getResourceUtilizationData(): Promise<ResourceUtilization[]> {
    const collection = await this.getResourceUtilizationCollection();
    if (!collection) return [];
    
    const result: ResourceUtilization[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToResourceUtilization(item.fields));
      }
    }
    
    return result;
  }
  
  /**
   * Gets resource replication summary collection
   * @returns The resource replication summary collection if found, null otherwise
   */
  async getResourceRepSummaryCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('resource_rep_summary');
  }
  
  /**
   * Gets resource replication summary data as strongly typed objects
   * @returns Array of ResourceRepSummary objects
   */
  async getResourceRepSummaryData(): Promise<ResourceRepSummary[]> {
    const collection = await this.getResourceRepSummaryCollection();
    if (!collection) return [];
    
    const result: ResourceRepSummary[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToResourceRepSummary(item.fields));
      }
    }
    
    return result;
  }
  
  /**
   * Gets activity data by ID
   * @param activityId The ID of the activity to get
   * @returns The activity data or null if not found
   */
  async getActivityById(activityId: string): Promise<ActivityUtilization | null> {
    const collection = await this.getActivityUtilizationCollection();
    if (!collection) return null;
    
    const item = collection.items.get(activityId);
    if (!item) return null;
    
    return mapToActivityUtilization(item.fields);
  }
  
  /**
   * Gets entity state cross replication summary collection
   * @returns The entity state cross replication summary collection if found, null otherwise
   */
  async getEntityStateCrossRepSummaryCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('entity_state_cross_rep_summary');
  }
  
  /**
   * Gets entity state cross replication summary data as strongly typed objects
   * @returns Array of EntityStateCrossRepSummary objects
   */
  async getEntityStateCrossRepSummaryData(): Promise<EntityStateCrossRepSummary[]> {
    const collection = await this.getEntityStateCrossRepSummaryCollection();
    console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummary collection:', collection ? 'Found' : 'Not found');
    if (!collection) return [];
    
    const result: EntityStateCrossRepSummary[] = [];
    console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummary collection size:', collection.items.size);
    
    for (const [key, item] of collection.items) {
      if (item) {
        console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummary raw item key:', key);
        console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummary raw fields:', JSON.stringify(item.fields));
        const mappedItem = mapToEntityStateCrossRepSummary(item.fields);
        console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummary mapped item:', JSON.stringify(mappedItem));
        result.push(mappedItem);
      }
    }
    
    console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummary final result size:', result.length);
    if (result.length > 0) {
      console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummary sample entity_name:', result[0].entity_name);
      console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummary sample scenario_name:', result[0].scenario_name);
    }
    
    return result;
  }
  
  /**
   * Gets entity throughput cross replication summary collection
   * @returns The entity throughput cross replication summary collection if found, null otherwise
   */
  async getEntityThroughputCrossRepSummaryCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('entity_throughput_cross_rep_summary');
  }
  
  /**
   * Gets entity throughput cross replication summary data as strongly typed objects
   * @returns Array of EntityThroughputCrossRepSummary objects
   */
  async getEntityThroughputCrossRepSummaryData(): Promise<EntityThroughputCrossRepSummary[]> {
    const collection = await this.getEntityThroughputCrossRepSummaryCollection();
    console.log('[DEBUG] EntityThroughputCrossRepSummary collection:', collection ? 'Found' : 'Not found');
    if (!collection) return [];
    
    const result: EntityThroughputCrossRepSummary[] = [];
    console.log('[DEBUG] EntityThroughputCrossRepSummary collection size:', collection.items.size);
    
    for (const [key, item] of collection.items) {
      if (item) {
        console.log('[DEBUG] EntityThroughputCrossRepSummary raw item key:', key);
        console.log('[DEBUG] EntityThroughputCrossRepSummary raw fields:', JSON.stringify(item.fields));
        const mappedItem = mapToEntityThroughputCrossRepSummary(item.fields);
        console.log('[DEBUG] EntityThroughputCrossRepSummary mapped item:', JSON.stringify(mappedItem));
        result.push(mappedItem);
      }
    }
    
    console.log('[DEBUG] EntityThroughputCrossRepSummary final result size:', result.length);
    if (result.length > 0) {
      console.log('[DEBUG] EntityThroughputCrossRepSummary sample entity_name:', result[0].entity_name);
      console.log('[DEBUG] EntityThroughputCrossRepSummary sample scenario_name:', result[0].scenario_name);
    }
    
    return result;
  }

  /**
   * Checks if simulation results exist for the current document
   * @returns True if any simulation results collections exist, false otherwise
   */
  async hasSimulationResults(): Promise<boolean> {
    const collections = await this.getAllCollections();
    return collections !== null && collections.size > 0;
  }
}