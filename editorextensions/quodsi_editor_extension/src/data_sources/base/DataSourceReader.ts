import { EditorClient, DataProxy, DataSourceProxy, CollectionProxy, MapProxy } from 'lucid-extension-sdk';

/**
 * Base class for accessing data sources in LucidChart
 * Provides common methods for accessing data sources and collections
 */
export abstract class DataSourceReader {
  protected client: EditorClient;
  protected dataProxy: DataProxy;
  protected dataSourceName: string;
  
  constructor(client: EditorClient, dataSourceName: string) {
    this.client = client;
    this.dataProxy = new DataProxy(client);
    this.dataSourceName = dataSourceName;
  }
  
  /**
   * Gets the data source by name
   * @returns The data source if found, null otherwise
   */
  protected getDataSource(): DataSourceProxy | null {
    for (const [key, source] of this.dataProxy.dataSources) {
      if (source.getName() === this.dataSourceName) {
        return source;
      }
    }
    console.log(`Data source "${this.dataSourceName}" not found`);
    return null;
  }
  
  /**
   * Gets a collection from this data source by name
   * @param collectionName The name of the collection to retrieve
   * @returns The collection if found, null otherwise
   */
  async getCollectionByName(collectionName: string): Promise<CollectionProxy | null> {
    const dataSource = this.getDataSource();
    if (!dataSource) return null;
    
    for (const [collectionId, collection] of dataSource.collections) {
      if (collection.getName() === collectionName) {
        return collection;
      }
    }
    
    console.log(`Collection "${collectionName}" not found in data source "${this.dataSourceName}"`);
    return null;
  }
  
  /**
   * Gets all collections from this data source
   * @returns A map proxy of all collections in the data source, or null if the data source is not found
   */
  async getAllCollections(): Promise<MapProxy<string, CollectionProxy> | null> {
    const dataSource = this.getDataSource();
    if (!dataSource) return null;
    
    return dataSource.collections;
  }
}