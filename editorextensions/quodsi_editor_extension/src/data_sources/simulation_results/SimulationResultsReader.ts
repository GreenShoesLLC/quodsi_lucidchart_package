import { EditorClient, CollectionProxy, MapProxy, DataItemProxy } from 'lucid-extension-sdk';
import { DataSourceReader } from '../base/DataSourceReader';
import {
  ModelData, mapToModelData,
  ActivityRepSummary, mapToActivityRepSummary,
  ActivityCrossRep, mapToActivityCrossRep,
  EntityRep, mapToEntityRep,
  EntityCrossRep, mapToEntityCrossRep,
  ResourceRepSummary, mapToResourceRepSummary,
  ResourceCrossRep, mapToResourceCrossRep
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
   * Gets activity cross replication collection
   * @returns The activity cross replication collection if found, null otherwise
   */
  async getActivityCrossRepCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('activity_cross_rep');
  }

  /**
   * Gets activity cross replication data as strongly typed objects
   * @returns Array of ActivityCrossRep objects
   */
  async getActivityCrossRepData(): Promise<ActivityCrossRep[]> {
    const collection = await this.getActivityCrossRepCollection();
    if (!collection) return [];

    const result: ActivityCrossRep[] = [];

    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToActivityCrossRep(item.fields));
      }
    }

    return result;
  }

  /**
   * Gets entity replication collection
   * @returns The entity replication collection if found, null otherwise
   */
  async getEntityRepCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('entity_rep');
  }

  /**
   * Gets entity replication data as strongly typed objects
   * @returns Array of EntityRep objects
   */
  async getEntityRepData(): Promise<EntityRep[]> {
    const collection = await this.getEntityRepCollection();
    if (!collection) return [];

    const result: EntityRep[] = [];

    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToEntityRep(item.fields));
      }
    }

    return result;
  }

  /**
   * Gets entity cross replication collection
   * @returns The entity cross replication collection if found, null otherwise
   */
  async getEntityCrossRepCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('entity_cross_rep');
  }

  /**
   * Gets entity cross replication data as strongly typed objects
   * @returns Array of EntityCrossRep objects
   */
  async getEntityCrossRepData(): Promise<EntityCrossRep[]> {
    const collection = await this.getEntityCrossRepCollection();
    if (!collection) return [];

    const result: EntityCrossRep[] = [];

    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToEntityCrossRep(item.fields));
      }
    }

    return result;
  }

  /**
   * Gets resource cross replication collection
   * @returns The resource cross replication collection if found, null otherwise
   */
  async getResourceCrossRepCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('resource_cross_rep');
  }

  /**
   * Gets resource cross replication data as strongly typed objects
   * @returns Array of ResourceCrossRep objects
   */
  async getResourceCrossRepData(): Promise<ResourceCrossRep[]> {
    const collection = await this.getResourceCrossRepCollection();
    if (!collection) return [];

    const result: ResourceCrossRep[] = [];

    for (const [_, item] of collection.items) {
      if (item) {
        result.push(mapToResourceCrossRep(item.fields));
      }
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