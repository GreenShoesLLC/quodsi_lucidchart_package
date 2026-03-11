import { 
  ItemProxy, 
  ElementProxy, 
  BlockProxy, 
  LineProxy 
} from 'lucid-extension-sdk';
import { 
  SelectionType, 
  SimulationObjectType, 
  ElementShape 
} from '@quodsi/shared';
import { ModelManager } from '../../../../../core/ModelManager';

/**
 * Utility functions for selection type determination
 */
export const selectionTypeUtils = {
  /**
   * Determines the selection type based on the selected items
   * @param items The selected items
   * @param modelManager The model manager
   * @returns The determined selection type
   */
  async determineSelectionType(
    items: ItemProxy[],
    modelManager: ModelManager
  ): Promise<SelectionType> {
    console.log('[selectionTypeUtils] Determining selection type', { 
      itemCount: items.length 
    });

    if (items.length === 0) {
      console.log('[selectionTypeUtils] No items selected, returning NONE');
      return SelectionType.NONE;
    }
    
    if (items.length > 1) {
      console.log('[selectionTypeUtils] Multiple items selected, returning MULTIPLE');
      return SelectionType.MULTIPLE;
    }

    const item = items[0];
    console.log('[selectionTypeUtils] Processing single item selection', { 
      itemId: item.id 
    });

    // Check for swimlane blocks BEFORE the unconverted check.
    // Swimlanes are visual containers, not simulation objects — they use
    // q_swimlane storage (not q_data), so they'd be classified as "unconverted"
    // without this early return.
    if (item instanceof BlockProxy && item.getClassName() === 'AdvancedSwimLaneBlock') {
      console.log('[selectionTypeUtils] Item is a swimlane block', { itemId: item.id });
      return SelectionType.SWIMLANE;
    }

    if (modelManager.isUnconvertedElement(item)) {
      console.log('[selectionTypeUtils] Item is unconverted', { 
        itemId: item.id 
      });
      return SelectionType.UNCONVERTED_ELEMENT;
    }

    const typeInfo = modelManager.getElementType(item);
    console.log('[selectionTypeUtils] Retrieved type info', {
      itemId: item.id,
      typeInfo
    });

    if (!typeInfo?.type || typeInfo.type === SimulationObjectType.None) {
      console.log('[selectionTypeUtils] Invalid or None type, treating as unconverted', {
        itemId: item.id
      });
      return SelectionType.UNCONVERTED_ELEMENT;
    }

    const selectionType = this.mapElementTypeToSelectionType(typeInfo.type);
    console.log('[selectionTypeUtils] Mapped element type to selection type', {
      itemId: item.id,
      elementType: typeInfo.type,
      selectionType
    });
    
    return selectionType;
  },

  /**
   * Maps simulation object type to selection type
   * @param elementType The simulation object type
   * @returns The corresponding selection type
   */
  mapElementTypeToSelectionType(elementType: SimulationObjectType): SelectionType {
    console.log('[selectionTypeUtils] Mapping element type to selection type', { 
      elementType 
    });

    // Create a type-safe mapping object
    const mapping: Partial<Record<SimulationObjectType, SelectionType>> = {
      [SimulationObjectType.Activity]: SelectionType.ACTIVITY,
      [SimulationObjectType.Connector]: SelectionType.CONNECTOR,
      [SimulationObjectType.Entity]: SelectionType.ENTITY,
      [SimulationObjectType.Generator]: SelectionType.GENERATOR,
      [SimulationObjectType.Resource]: SelectionType.RESOURCE,
      [SimulationObjectType.Model]: SelectionType.MODEL
    };

    const result = mapping[elementType] ?? SelectionType.UNKNOWN_BLOCK;
    console.log('[selectionTypeUtils] Type mapping result', { 
      elementType, 
      result 
    });
    
    return result;
  },

  /**
   * Creates element shapes from item proxies
   * @param items The item proxies
   * @returns Array of element shapes
   */
  createElementShapes(items: ItemProxy[]): ElementShape[] {
    return items.map(item => ({
      id: item.id,
      type: item instanceof LineProxy ? 'line' : 'block',
      text: item instanceof BlockProxy ? this.getBlockText(item) : ''
    }));
  },

  /**
   * Gets the text from a block proxy
   * @param block The block proxy
   * @returns The text of the block
   */
  getBlockText(block: BlockProxy): string {
    const textAreaKeys = Array.from(block.textAreas.keys());
    if (textAreaKeys.length > 0) {
      return block.textAreas.get(textAreaKeys[0]) || '';
    }
    return '';
  }
};
