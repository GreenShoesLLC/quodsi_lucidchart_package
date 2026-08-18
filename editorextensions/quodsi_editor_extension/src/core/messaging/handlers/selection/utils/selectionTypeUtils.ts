import { 
  ItemProxy, 
  ElementProxy, 
  BlockProxy, 
  LineProxy 
} from 'lucid-extension-sdk';
import {
  SelectionType,
  SimulationObjectType,
  ElementShape,
  getLogger
} from '@quodsi/lucid-shared';
import { ModelManager } from '../../../../../core/ModelManager';

const log = getLogger('selectionTypeUtils');

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
    log.trace('Determining selection type', {
      itemCount: items.length
    });

    if (items.length === 0) {
      return SelectionType.NONE;
    }

    if (items.length > 1) {
      return SelectionType.MULTIPLE;
    }

    const item = items[0];

    // Check for swimlane blocks BEFORE the unconverted check.
    // Swimlanes are visual containers, not simulation objects — they use
    // q_swimlane storage (not q_data), so they'd be classified as "unconverted"
    // without this early return.
    if (item instanceof BlockProxy && item.getClassName() === 'AdvancedSwimLaneBlock') {
      log.trace('Item is a swimlane block', { itemId: item.id });
      return SelectionType.SWIMLANE;
    }

    if (modelManager.isUnconvertedElement(item)) {
      log.trace('Item is unconverted', {
        itemId: item.id
      });
      return SelectionType.UNCONVERTED_ELEMENT;
    }

    const typeInfo = modelManager.getElementType(item);
    log.trace('Retrieved type info', {
      itemId: item.id,
      typeInfo
    });

    if (!typeInfo?.type || typeInfo.type === SimulationObjectType.None) {
      log.trace('Invalid or None type, treating as unconverted', {
        itemId: item.id
      });
      return SelectionType.UNCONVERTED_ELEMENT;
    }

    const selectionType = this.mapElementTypeToSelectionType(typeInfo.type);
    log.trace('Mapped element type to selection type', {
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
    log.trace('Mapping element type to selection type', {
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
    log.trace('Type mapping result', {
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
