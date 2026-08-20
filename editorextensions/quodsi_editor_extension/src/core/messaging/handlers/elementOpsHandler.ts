import { EnvelopeBase, EnvelopeMessageType, JsonObject, SimulationObjectType, getLogger } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport, ElementProxy, PageProxy, EditorClient } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { PanelRole } from '../types';
import { SelectionHandler } from './selection/SelectionHandler';

const log = getLogger('ElementOpsHandler');

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
          .catch(err => log.error('Error in handleElementSelect:', err));
        return true;

      case EnvelopeMessageType.ELEMENT_UPDATE:
        // Start the async process but return true synchronously
        ElementOpsHandler.handleElementUpdate(msg)
          .catch(err => log.error('Error in handleElementUpdate:', err));
        return true;

      case EnvelopeMessageType.ELEMENT_UPDATE_RESULT:
        return ElementOpsHandler.handleElementUpdateResult(msg);

      case EnvelopeMessageType.ELEMENT_CONVERT:
        // Start the async process but return true synchronously
        ElementOpsHandler.handleElementConvert(msg)
          .catch(err => log.error('Error in handleElementConvert:', err));
        return true;

      case EnvelopeMessageType.ELEMENT_CONVERT_RESULT:
        return ElementOpsHandler.handleElementConvertResult(msg);

      // Not an element operations message
      default:
        return false;
    }
  }

  /**
   * Determine which channel to send a response to based on the message
   * source. Mirrors SimulationRunHandler.getResponseChannel /
   * DiagramMappingRelayHandler.getResponseChannel / ModelRootHandler's own
   * copy: a message that originates from the pattern-editor modal
   * ('pattern-iframe') or the schedule-editor modal ('schedule-iframe') gets
   * its reply routed back to that modal's own channel; everything else (the
   * side panel, source 'model-iframe') goes to 'model' -- the channel this
   * handler always used before either modal existed, so a panel-originated
   * request is unaffected.
   *
   * The 'schedule-iframe' branch matters on the FIRST interaction with a
   * fresh Scheduled generator: quodsi_studio's ScheduleModal creates and
   * links a default schedule on first use via accessor.updateShape(...),
   * which is an ELEMENT_UPDATE through this same handler (not a
   * MODEL_ROOT_UPDATE through ModelRootHandler). Without this branch that
   * write's RESULT would route to 'model' instead of 'schedule', and the
   * modal's saveShape call would hang for the full 30s ELEMENT_UPDATE
   * timeout before rejecting and rolling back -- see
   * elementOpsHandler.scheduleRouting.test.ts.
   *
   * Used only by handleElementUpdate (ELEMENT_UPDATE / ELEMENT_UPDATE_RESULT)
   * -- the route the pattern/schedule modals' bufferingAccessor actually
   * calls (via useModelRootSource's saveShape). handleElementConvert
   * (ELEMENT_CONVERT / ELEMENT_CONVERT_RESULT) intentionally does NOT use
   * this: neither modal sends ELEMENT_CONVERT (their tabs only call
   * accessor.updateShape/updateModel), and shape-type conversion is only
   * reachable from the side panel's element editors
   * (ActivityEditor/GeneratorEditor/ModelEditor via
   * modelOpsSender.convertElement) -- see elementOpsHandler.ts's
   * handleElementConvert sends, left hardcoded to 'model'.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'pattern-iframe') return 'pattern';
    if (msg.source === 'schedule-iframe') return 'schedule';
    return 'model';
  }

  /**
   * Handle element select request - clears selection to show Model Editor
   *
   * @param msg ELEMENT_SELECT message
   * @returns True indicating message was handled
   */
  private static async handleElementSelect(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as { elementId?: string };

    log.debug('Element select requested', { elementId: data.elementId });

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
      log.error('Error selecting element', error);
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

    log.debug('Element update requested', {
      elementId: data.elementId,
      type: data.type,
      diagramElementType: data.diagramElementType
    });

    const channel = ElementOpsHandler.getResponseChannel(msg);

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
        log.debug('Updating Model (Page) directly:', {
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

      // Send success response -- routed to whichever surface issued the
      // request (side panel or the pattern-editor modal), not always 'model'.
      router.send(channel, {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: true,
          elementId: data.elementId
        }
      });

      // Refresh the UI by re-processing the current selection
      // This ensures React receives fresh data with the updated element
      log.debug('Re-processing selection after save:', data.type);
      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;

    } catch (error) {
      log.error('Error updating element', error);

      // Send error response -- same requester-derived routing as the
      // success path above.
      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
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
    
    log.debug('Element update result received', {
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

    log.debug('Element conversion requested', {
      elementId: data.elementId,
      newType: data.newType,
      diagramElementType: data.diagramElementType
    });

    try {
      // Entities are no longer shape-mapped — they are defined in the Model Editor's
      // Entities tab and stored in the page-level q_entities list. Reject any attempt
      // to convert a shape into an Entity so a stray request can't create one.
      if (data.newType === 'Entity' || data.newType === SimulationObjectType.Entity) {
        throw new Error('Entities are no longer created from shapes. Use the Entities tab in the Model Editor.');
      }

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
        log.debug('Converting to Model (Page) directly:', {
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

      // Send success response -- deliberately hardcoded to 'model', not
      // getResponseChannel(msg). ELEMENT_CONVERT is only ever sent by the
      // side panel's element editors (modelOpsSender.convertElement); the
      // pattern-editor modal has no conversion UI and never issues this
      // message. See getResponseChannel's doc comment above.
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
      log.debug('Re-processing selection after convert:', data.newType);
      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;

    } catch (error) {
      log.error('Error converting element', error);

      // Send error response -- same hardcoded 'model' as the success path
      // above (see that comment for why).
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
    
    log.debug('Element conversion result received', {
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
      return null;
    }

    log.trace('Finding element:', {
      elementId,
      diagramElementType,
      hasHint: !!diagramElementType
    });

    // If we have a hint about the element type, check that collection first
    if (diagramElementType?.toLowerCase() === 'line') {
      // Check lines first when we know it's a line
      const line = page.allLines?.get(elementId);
      if (line) {
        log.trace('Found element in allLines (via hint):', {
          elementId,
          type: 'LineProxy'
        });
        return line;
      }
      // Still check blocks as fallback
      const block = page.allBlocks?.get(elementId);
      if (block) {
        log.trace('Found element in allBlocks (fallback from line hint):', {
          elementId,
          type: 'BlockProxy'
        });
        return block;
      }
    } else if (diagramElementType?.toLowerCase() === 'block') {
      // Check blocks first when we know it's a block
      const block = page.allBlocks?.get(elementId);
      if (block) {
        log.trace('Found element in allBlocks (via hint):', {
          elementId,
          type: 'BlockProxy'
        });
        return block;
      }
      // Still check lines as fallback
      const line = page.allLines?.get(elementId);
      if (line) {
        log.trace('Found element in allLines (fallback from block hint):', {
          elementId,
          type: 'LineProxy'
        });
        return line;
      }
    } else {
      // No hint provided, check both (blocks first for backwards compatibility)
      const block = page.allBlocks?.get(elementId);
      if (block) {
        log.trace('Found element in allBlocks (no hint):', {
          elementId,
          type: 'BlockProxy'
        });
        return block;
      }

      const line = page.allLines?.get(elementId);
      if (line) {
        log.trace('Found element in allLines (no hint):', {
          elementId,
          type: 'LineProxy'
        });
        return line;
      }
    }

    log.trace('Element not found:', {
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
    log.warn(`Unknown element type: ${typeString}, defaulting to None`);
    return SimulationObjectType.None;
  }
}
