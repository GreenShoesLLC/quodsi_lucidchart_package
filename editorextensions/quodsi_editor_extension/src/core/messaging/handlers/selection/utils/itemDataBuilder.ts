import { 
  ItemProxy, 
  PageProxy,
  BlockProxy
} from 'lucid-extension-sdk';
import { 
  ModelItemData,
  MetaData,
  SimulationObjectType
} from '@quodsi/shared';
import { ModelManager } from '../../../../../core/ModelManager';
import { ExtensionDebugService } from '../../../../logging/ExtensionDebugService';

/**
 * Utility functions for building model item data
 */
export const itemDataBuilder = {
  debug: ExtensionDebugService.forComponent('ItemDataBuilder'),
  /**
   * Gets name from a block's text areas
   * @param block The block proxy
   * @param defaultPrefix Default prefix for generated names
   * @returns The name extracted from the block
   */
  getNameFromBlock(block: BlockProxy, defaultPrefix: string): string {
    // Check for text areas on the block
    if (block.textAreas && block.textAreas.size > 0) {
      for (const text of block.textAreas.values()) {
        if (text && text.trim()) {
          return text.trim();
        }
      }
    }

    // If no text found, use class name
    const className = block.getClassName() || 'Block';
    return `${defaultPrefix} ${className}`;
  },

  /**
   * Builds a ModelItemData object from an item
   * @param item The item proxy or page proxy
   * @param modelManager The model manager
   * @returns The model item data
   */
  async buildModelItemData(
    item: ItemProxy | PageProxy,
    modelManager: ModelManager
  ): Promise<ModelItemData> {
    this.debug.log('Building model item data for', {
      itemId: item.id,
      isPage: item instanceof PageProxy
    });
    
    const rawData = modelManager.getElementData(item);
    const metadata = modelManager.getMetadata(item);

    // Determine name based on item type
    let name: string;
    if (item instanceof PageProxy) {
      name = item.getTitle() || 'Untitled Model';
    } else if (item instanceof BlockProxy) {
      // Use our own getNameFromBlock method
      name = this.getNameFromBlock(item, 'Item');
    } else {
      name = 'Unnamed Connector';
    }

    // Ensure metadata has all required fields
    const defaultMetadata: MetaData = {
      type: item instanceof PageProxy ? SimulationObjectType.Model : SimulationObjectType.None,
      version: modelManager.CURRENT_VERSION,
      lastModified: new Date().toISOString(),
      id: item.id,
      ...(metadata || {})
    };

    // Handle unconverted elements
    if (item instanceof ItemProxy && modelManager.isUnconvertedElement(item)) {
      defaultMetadata.isUnconverted = true;
    }

    // Convert Lucid JsonObject to shared JsonObject type
    const convertedData = rawData ? JSON.parse(JSON.stringify(rawData)) : {};

    const result: ModelItemData = {
      id: item.id,
      data: convertedData,
      metadata: defaultMetadata,
      name
    };
    
    this.debug.log('Built model item data', {
      id: result.id,
      name: result.name,
      type: result.metadata.type
    });
    
    return result;
  },
  
  /**
   * Builds multiple ModelItemData objects from an array of items
   * @param items The item proxies
   * @param modelManager The model manager
   * @returns Array of model item data
   */
  async buildMultipleModelItemData(
    items: ItemProxy[],
    modelManager: ModelManager
  ): Promise<ModelItemData[]> {
    this.debug.log('Building multiple model item data for', {
      itemCount: items.length
    });
    
    return Promise.all(
      items.map(item => this.buildModelItemData(item, modelManager))
    );
  }
};