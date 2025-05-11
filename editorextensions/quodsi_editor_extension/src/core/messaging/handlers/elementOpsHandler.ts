import { EnvelopeBase, EnvelopeMessageType, JsonObject, SimulationObjectType } from '@quodsi/shared';
import { router } from '../index';
import { Viewport, ElementProxy, PageProxy, EditorClient } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';


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
    };
    
    console.log('[ElementOpsHandler] Element update requested', {
      elementId: data.elementId,
      type: data.type
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
      
      // Find the element by ID
      const element = ElementOpsHandler.findElementById(viewport, data.elementId);
      if (!element) {
        throw new Error(`Element not found: ${data.elementId}`);
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
      
      // Handle selection change to refresh UI
      const selectedItems = viewport.getSelectedItems();
      if (selectedItems.some(item => item.id === data.elementId)) {
        // Re-selecting the element will refresh the UI
        viewport.setSelectedItems(selectedItems); // Use correct method name
      }
      
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
    };
    
    console.log('[ElementOpsHandler] Element conversion requested', {
      elementId: data.elementId,
      newType: data.newType
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
      
      // Find the element by ID
      const element = ElementOpsHandler.findElementById(viewport, data.elementId);
      if (!element) {
        throw new Error(`Element not found: ${data.elementId}`);
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
      
      // Handle selection change to refresh UI
      const selectedItems = viewport.getSelectedItems();
      if (selectedItems.some(item => item.id === data.elementId)) {
        // Re-selecting the element will refresh the UI
        viewport.setSelectedItems(selectedItems); // Use correct method name
      }
      
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
   * @returns Found element or null
   */
  private static findElementById(viewport: Viewport, elementId: string): ElementProxy | null {
    const page = viewport.getCurrentPage();
    if (!page) return null;
    
    // Check both blocks and lines collections
    // These are typically Maps with element ID as the key
    return page.allBlocks?.get(elementId) || 
           page.allLines?.get(elementId) || 
           null;
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
