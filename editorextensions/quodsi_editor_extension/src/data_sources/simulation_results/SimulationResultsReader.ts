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
  CompleteActivityMetrics, mapToCompleteActivityMetrics,
  CustomMetrics, mapToCustomMetrics
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
   * Gets complete activity metrics collection
   * @returns The complete activity metrics collection if found, null otherwise
   */
  async getCompleteActivityMetricsCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('complete_activity_metrics');
  }
  
  /**
   * Gets complete activity metrics data as strongly typed objects
   * @returns Array of CompleteActivityMetrics objects
   */
  async getCompleteActivityMetricsData(): Promise<CompleteActivityMetrics[]> {
    const collection = await this.getCompleteActivityMetricsCollection();
    if (!collection) return [];
    
    const result: CompleteActivityMetrics[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToCompleteActivityMetrics(item.fields));
      }
    }
    
    return result;
  }
  
  /**
   * Gets custom metrics collection
   * @returns The custom metrics collection if found, null otherwise
   */
  async getCustomMetricsCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('custom_metrics');
  }
  
  /**
   * Gets custom metrics data as strongly typed objects
   * @returns Array of CustomMetrics objects
   */
  async getCustomMetricsData(): Promise<CustomMetrics[]> {
    const collection = await this.getCustomMetricsCollection();
    if (!collection) return [];
    
    const result: CustomMetrics[] = [];
    
    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToCustomMetrics(item.fields));
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
   * Checks if simulation results exist for the current document
   * @returns True if any simulation results collections exist, false otherwise
   */
  async hasSimulationResults(): Promise<boolean> {
    const collections = await this.getAllCollections();
    return collections !== null && collections.size > 0;
  }
}