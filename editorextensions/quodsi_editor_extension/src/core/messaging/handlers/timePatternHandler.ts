import { EnvelopeBase, EnvelopeMessageType, ISerializedTimePattern, ISerializedTimeDistributedConfig } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { SelectionHandler } from './selection/SelectionHandler';


/**
 * Handler for time pattern and time distributed config operations
 */
export class TimePatternHandler {
  /**
   * Handle messages related to time pattern operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.TIME_PATTERNS_UPDATE:
        // Start the async process but return true synchronously
        TimePatternHandler.handleTimePatternsUpdate(msg)
          .catch(err => console.error('[TimePatternHandler] Error in handleTimePatternsUpdate:', err));
        return true;

      case EnvelopeMessageType.TIME_PATTERNS_UPDATE_RESULT:
        return TimePatternHandler.handleTimePatternsUpdateResult(msg);

      case EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE:
        // Start the async process but return true synchronously
        TimePatternHandler.handleTimeDistributedConfigsUpdate(msg)
          .catch(err => console.error('[TimePatternHandler] Error in handleTimeDistributedConfigsUpdate:', err));
        return true;

      case EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE_RESULT:
        return TimePatternHandler.handleTimeDistributedConfigsUpdateResult(msg);

      // Not a time pattern operations message
      default:
        return false;
    }
  }

  /**
   * Handle time patterns update request
   *
   * @param msg TIME_PATTERNS_UPDATE message
   * @returns True indicating message was handled
   */
  private static async handleTimePatternsUpdate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      timePatterns: ISerializedTimePattern[];
    };

    console.log('[TimePatternHandler] Time patterns update requested', {
      patternsCount: data.timePatterns.length
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

      // Update time patterns using ModelManager
      await modelManager.updateTimePatterns(data.timePatterns, currentPage);

      // Validate the model after update
      await modelManager.validateModel();

      // Trigger a selection change to send updated data back to React
      // IMPORTANT: Force rebuild of referenceData to ensure React receives updated time patterns
      await SelectionHandler.sendSelectionChangedMessage(true);

      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.TIME_PATTERNS_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true
        }
      });

      return true;

    } catch (error) {
      console.error('[TimePatternHandler] Error updating time patterns', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.TIME_PATTERNS_UPDATE_RESULT,
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
   * Handle time patterns update result
   *
   * @param msg TIME_PATTERNS_UPDATE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleTimePatternsUpdateResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      errorMessage?: string;
    };

    console.log('[TimePatternHandler] Time patterns update result received', {
      success: data.success,
      error: data.errorMessage
    });

    return true;
  }

  /**
   * Handle time distributed configs update request
   *
   * @param msg TIME_DISTRIBUTED_CONFIGS_UPDATE message
   * @returns True indicating message was handled
   */
  private static async handleTimeDistributedConfigsUpdate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      timeDistributedConfigs: ISerializedTimeDistributedConfig[];
    };

    console.log('[TimePatternHandler] Time distributed configs update requested', {
      configsCount: data.timeDistributedConfigs.length
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

      // Update time distributed configs using ModelManager
      await modelManager.updateTimeDistributedConfigs(data.timeDistributedConfigs, currentPage);

      // Validate the model after update
      await modelManager.validateModel();

      // Trigger a selection change to send updated data back to React
      // IMPORTANT: Force rebuild of referenceData to ensure React receives updated configs
      await SelectionHandler.sendSelectionChangedMessage(true);

      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true
        }
      });

      return true;

    } catch (error) {
      console.error('[TimePatternHandler] Error updating time distributed configs', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE_RESULT,
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
   * Handle time distributed configs update result
   *
   * @param msg TIME_DISTRIBUTED_CONFIGS_UPDATE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleTimeDistributedConfigsUpdateResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      errorMessage?: string;
    };

    console.log('[TimePatternHandler] Time distributed configs update result received', {
      success: data.success,
      error: data.errorMessage
    });

    return true;
  }
}
