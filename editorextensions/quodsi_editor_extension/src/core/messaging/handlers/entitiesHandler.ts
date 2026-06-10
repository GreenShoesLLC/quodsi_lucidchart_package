import { EnvelopeBase, EnvelopeMessageType, ISerializedEntity } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport, PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { SelectionHandler } from './selection/SelectionHandler';


/**
 * Handler for entities operations (update entities array)
 *
 * Entities are stored as a page-level list (q_entities), mirroring States.
 */
export class EntitiesHandler {
  /**
   * Handle messages related to entities operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.ENTITIES_UPDATE:
        // Start the async process but return true synchronously
        EntitiesHandler.handleEntitiesUpdate(msg)
          .catch(err => console.error('[EntitiesHandler] Error in handleEntitiesUpdate:', err));
        return true;

      case EnvelopeMessageType.ENTITIES_UPDATE_RESULT:
        return EntitiesHandler.handleEntitiesUpdateResult(msg);

      // Not an entities operations message
      default:
        return false;
    }
  }

  /**
   * Handle entities update request
   *
   * @param msg ENTITIES_UPDATE message
   * @returns True indicating message was handled
   */
  private static async handleEntitiesUpdate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      entities: ISerializedEntity[];
    };

    console.log('[EntitiesHandler] Entities update requested', {
      entitiesCount: data.entities.length
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

      // Update entities using ModelManager
      await modelManager.updateEntities(data.entities, currentPage);

      // Validate the model after update
      await modelManager.validateModel();

      // Trigger a selection change to send updated entities back to React
      // IMPORTANT: Force rebuild of referenceData to ensure React receives updated entities
      await SelectionHandler.sendSelectionChangedMessage(true);

      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.ENTITIES_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true
        }
      });

      return true;

    } catch (error) {
      console.error('[EntitiesHandler] Error updating entities', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.ENTITIES_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });

      return false;
    }
  }

  /**
   * Handle entities update result
   *
   * @param msg ENTITIES_UPDATE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleEntitiesUpdateResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      errorMessage?: string;
    };

    console.log('[EntitiesHandler] Entities update result received', {
      success: data.success,
      error: data.errorMessage
    });

    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness

    return true;
  }
}
