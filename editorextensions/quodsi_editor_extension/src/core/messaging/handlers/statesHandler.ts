import { EnvelopeBase, EnvelopeMessageType, ISerializedState } from '@quodsi/shared';
import { router } from '../index';
import { Viewport, PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { SelectionHandler } from './selection/SelectionHandler';


/**
 * Handler for states operations (update states array)
 */
export class StatesHandler {
  /**
   * Handle messages related to states operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.STATES_UPDATE:
        // Start the async process but return true synchronously
        StatesHandler.handleStatesUpdate(msg)
          .catch(err => console.error('[StatesHandler] Error in handleStatesUpdate:', err));
        return true;

      case EnvelopeMessageType.STATES_UPDATE_RESULT:
        return StatesHandler.handleStatesUpdateResult(msg);

      // Not a states operations message
      default:
        return false;
    }
  }

  /**
   * Handle states update request
   *
   * @param msg STATES_UPDATE message
   * @returns True indicating message was handled
   */
  private static async handleStatesUpdate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      states: ISerializedState[];
    };

    console.log('[StatesHandler] States update requested', {
      statesCount: data.states.length
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

      // Update states using ModelManager
      await modelManager.updateStates(data.states, currentPage);

      // Validate the model after update
      await modelManager.validateModel();

      // Trigger a selection change to send updated states back to React
      // This ensures React gets the fresh states array
      // IMPORTANT: Force rebuild of referenceData to ensure React receives updated states
      await SelectionHandler.sendSelectionChangedMessage(true);

      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.STATES_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true
        }
      });

      return true;

    } catch (error) {
      console.error('[StatesHandler] Error updating states', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.STATES_UPDATE_RESULT,
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
   * Handle states update result
   *
   * @param msg STATES_UPDATE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleStatesUpdateResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      errorMessage?: string;
    };

    console.log('[StatesHandler] States update result received', {
      success: data.success,
      error: data.errorMessage
    });

    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness

    return true;
  }
}
