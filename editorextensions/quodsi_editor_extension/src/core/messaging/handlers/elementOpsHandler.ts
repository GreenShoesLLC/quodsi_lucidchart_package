import { EnvelopeBase, EnvelopeMessageType, JsonObject, SimulationObjectType } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport, ElementProxy, PageProxy, EditorClient } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { SelectionHandler } from './selection/SelectionHandler';


/**
 * Handler for element-level operations (update, convert)
 */
export class ElementOpsHandler {
  /**
   * Handle messages related to element operations
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.ELEMENT_SELECT:
        // Start the async process but return true synchronously
        ElementOpsHandler.handleElementSelect(msg)
          .catch(err => console.error('[ElementOpsHandler] Error in handleElementSelect:', err));
        return true;

      case EnvelopeMessageType.ELEMENT_UPDATE:
        // Start the async process but return true synchronously
        ElementOpsHandler.handleElementUpdate(msg)
          .catch(err => console.error('[ElementOpsHandler] Error in handleElementUpdate:', err));
        return true;

      case EnvelopeMessageType.ELEMENT_UPDATE_RESULT:
        return ElementOpsHandler.handleElementUpdateResult(msg);

      case EnvelopeMessageType.ELEMENT_CONVERT:
        // Start the async process but return true synchronously
        ElementOpsHandler.handleElementConvert(msg)
          .catch(err => console.error('[ElementOpsHandler] Error in handleElementConvert:', err));
        return true;

      case EnvelopeMessageType.ELEMENT_CONVERT_RESULT:
        return ElementOpsHandler.handleElementConvertResult(msg);

      // Not an element operations message
      default:
        return false;
    }
  }

  /**
   * Handle element select request - clears selection to show Model Editor
   *
   * @param msg ELEMENT_SELECT message
   * @returns True indicating message was handled
   */
  private static async handleElementSelect(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as { elementId?: string };

    console.log('[ElementOpsHandler] Element select requested', { elementId: data.elementId });

    try {
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);

      // Clear selection to show the Model/Page editor
      // When selection is empty on a Quodsi model page, React shows ModelEditor
      // Use Viewport.setSelectedItems([]) to clear the selection
      viewport.setSelectedItems([]);

      // The viewport.hookSelection callback will automatically trigger
      // SelectionHandler.handleLucidSelectionEvent which sends SELECTION_CHANGED
      // However, since we're programmatically clearing selection, we should
      // explicitly trigger the selection handler to ensure React gets updated
      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
    } catch (error) {
      console.error('[ElementOpsHandler] Error selecting element', error);
      return false;
    }
  }

  /**
   * Handle element update request
   *
   * @param msg ELEMENT_UPDATE message
   * @returns True indicating message was handled
   */
  private static async handleElementUpdate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      elementId: string;
      type: string;
      data: JsonObject;
      diagramElementType?: string;
    };

    console.log('[ElementOpsHandler] Element update requested', {
      elementId: data.elementId,
      type: data.type,
      diagramElementType: data.diagramElementType
    });

    try {
      // Get the client and model manager from singleton
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();

      // Get the viewport and current page
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      if (!currentPage) {
        throw new Error('Current page not available');
      }

      // Determine the element to update
      let element: ElementProxy;

      // Check if this is a Model update (Page-level data)
      if (data.type === 'Model' || data.type === SimulationObjectType.Model) {
        console.log('[ElementOpsHandler] Updating Model (Page) directly:', {
          elementId: data.elementId,
          pageId: currentPage.id
        });
        // Model is the Page itself, not a block or line
        element = currentPage;
      } else {
        // Find the element by ID, using diagram element type as hint if available
        const foundElement = ElementOpsHandler.findElementById(
          viewport,
          data.elementId,
          data.diagramElementType
        );
        if (!foundElement) {
          throw new Error(`Element not found: ${data.elementId}`);
        }
        element = foundElement;
      }
      
      // Convert string type to SimulationObjectType
      const elementType = ElementOpsHandler.getElementType(data.type);
      
      // Save element data using ModelManager
      await modelManager.saveElementData(
        element,
        {
          ...data.data,
          // Ensure ID is preserved
          id: data.elementId
        },
        elementType,
        currentPage
      );
      
      // Validate the model after update
      await modelManager.validateModel();
      
      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true,
          elementId: data.elementId
        }
      });

      // Refresh the UI by re-processing the current selection
      // This ensures React receives fresh data with the updated element
      console.log('[ElementOpsHandler] Re-processing selection after save:', data.type);
      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
      
    } catch (error) {
      console.error('[ElementOpsHandler] Error updating element', error);
      
      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          elementId: data.elementId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      
      return false;
    }
  }
  
  /**
   * Handle element update result
   * 
   * @param msg ELEMENT_UPDATE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleElementUpdateResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      elementId: string;
      errorMessage?: string;
    };
    
    console.log('[ElementOpsHandler] Element update result received', {
      success: data.success,
      elementId: data.elementId,
      error: data.errorMessage
    });
    
    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Handle element conversion request
   *
   * @param msg ELEMENT_CONVERT message
   * @returns True indicating message was handled
   */
  private static async handleElementConvert(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      elementId: string;
      newType: string;
      data?: JsonObject;
      diagramElementType?: string;
    };

    console.log('[ElementOpsHandler] Element conversion requested', {
      elementId: data.elementId,
      newType: data.newType,
      diagramElementType: data.diagramElementType
    });

    try {
      // Get the client and model manager from singleton
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();

      // Get the viewport and current page
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      if (!currentPage) {
        throw new Error('Current page not available');
      }

      // Determine the element to convert
      let element: ElementProxy;

      // Check if this is a Model conversion (Page-level)
      if (data.newType === 'Model' || data.newType === SimulationObjectType.Model) {
        console.log('[ElementOpsHandler] Converting to Model (Page) directly:', {
          elementId: data.elementId,
          pageId: currentPage.id
        });
        // Model is the Page itself, not a block or line
        element = currentPage;
      } else {
        // Find the element by ID, using diagram element type as hint if available
        const foundElement = ElementOpsHandler.findElementById(
          viewport,
          data.elementId,
          data.diagramElementType
        );
        if (!foundElement) {
          throw new Error(`Element not found: ${data.elementId}`);
        }
        element = foundElement;
      }

      // Convert string type to SimulationObjectType
      const newType = ElementOpsHandler.getElementType(data.newType);

      // Save element data using ModelManager with the new type
      await modelManager.saveElementData(
        element,
        data.data || {},
        newType,
        currentPage
      );

      // Validate the model after conversion
      await modelManager.validateModel();

      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.ELEMENT_CONVERT_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true,
          elementId: data.elementId
        }
      });

      // Refresh the UI by re-processing the current selection
      // This ensures React receives fresh data with the updated element type
      console.log('[ElementOpsHandler] Re-processing selection after convert:', data.newType);
      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;

    } catch (error) {
      console.error('[ElementOpsHandler] Error converting element', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.ELEMENT_CONVERT_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          elementId: data.elementId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });

      return false;
    }
  }
  
  /**
   * Handle element conversion result
   * 
   * @param msg ELEMENT_CONVERT_RESULT message
   * @returns True indicating message was handled
   */
  private static handleElementConvertResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      elementId: string;
      errorMessage?: string;
    };
    
    console.log('[ElementOpsHandler] Element conversion result received', {
      success: data.success,
      elementId: data.elementId,
      error: data.errorMessage
    });
    
    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Helper method to find an element by ID
   *
   * @param viewport Viewport instance
   * @param elementId Element ID to find
   * @param diagramElementType Optional hint about element type ('block' or 'line')
   * @returns Found element or null
   */
  private static findElementById(
    viewport: Viewport,
    elementId: string,
    diagramElementType?: string
  ): ElementProxy | null {
    const page = viewport.getCurrentPage();
    if (!page) {
      console.log('[ElementOpsHandler] No current page found');
      return null;
    }

    console.log('[ElementOpsHandler] Finding element:', {
      elementId,
      diagramElementType,
      hasHint: !!diagramElementType
    });

    // If we have a hint about the element type, check that collection first
    if (diagramElementType?.toLowerCase() === 'line') {
      // Check lines first when we know it's a line
      const line = page.allLines?.get(elementId);
      if (line) {
        console.log('[ElementOpsHandler] Found element in allLines (via hint):', {
          elementId,
          type: 'LineProxy'
        });
        return line;
      }
      // Still check blocks as fallback
      const block = page.allBlocks?.get(elementId);
      if (block) {
        console.log('[ElementOpsHandler] Found element in allBlocks (fallback from line hint):', {
          elementId,
          type: 'BlockProxy'
        });
        return block;
      }
    } else if (diagramElementType?.toLowerCase() === 'block') {
      // Check blocks first when we know it's a block
      const block = page.allBlocks?.get(elementId);
      if (block) {
        console.log('[ElementOpsHandler] Found element in allBlocks (via hint):', {
          elementId,
          type: 'BlockProxy'
        });
        return block;
      }
      // Still check lines as fallback
      const line = page.allLines?.get(elementId);
      if (line) {
        console.log('[ElementOpsHandler] Found element in allLines (fallback from block hint):', {
          elementId,
          type: 'LineProxy'
        });
        return line;
      }
    } else {
      // No hint provided, check both (blocks first for backwards compatibility)
      const block = page.allBlocks?.get(elementId);
      if (block) {
        console.log('[ElementOpsHandler] Found element in allBlocks (no hint):', {
          elementId,
          type: 'BlockProxy'
        });
        return block;
      }

      const line = page.allLines?.get(elementId);
      if (line) {
        console.log('[ElementOpsHandler] Found element in allLines (no hint):', {
          elementId,
          type: 'LineProxy'
        });
        return line;
      }
    }

    console.log('[ElementOpsHandler] Element not found:', {
      elementId,
      diagramElementType,
      lineCount: page.allLines?.size || 0,
      blockCount: page.allBlocks?.size || 0
    });
    return null;
  }
  
  /**
   * Helper method to convert string type to SimulationObjectType enum
   * 
   * @param typeString Type as string
   * @returns SimulationObjectType enum value
   */
  private static getElementType(typeString: string): SimulationObjectType {
    // Handle both string literals and enum value numbers
    if (!isNaN(Number(typeString))) {
      const numericType = Number(typeString);
      
      // Check if the numeric value has a corresponding enum key
      // We need to compare with the numeric representation of the enum
      // Since TypeScript enums get compiled to bidirectional mappings
      const enumValues = Object.values(SimulationObjectType)
        .filter(v => typeof v === 'number') as number[];
      
      if (enumValues.includes(numericType)) {
        // This is safe because we verified the number is a valid enum value
        return numericType as unknown as SimulationObjectType;
      }
    }
    
    // Check if string is a property name of SimulationObjectType
    const enumKeys = Object.keys(SimulationObjectType).filter(k => isNaN(Number(k)));
    for (const key of enumKeys) {
      if (key.toLowerCase() === typeString.toLowerCase()) {
        return SimulationObjectType[key as keyof typeof SimulationObjectType];
      }
    }
    
    // Default to None if not found
    console.warn(`[ElementOpsHandler] Unknown element type: ${typeString}, defaulting to None`);
    return SimulationObjectType.None;
  }
}
