import { EnvelopeBase, EnvelopeMessageType, ISerializedEntity, getLogger } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport, PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { PanelRole } from '../types';
import { SelectionHandler } from './selection/SelectionHandler';
import { assertWritePage, isPageMismatch } from '../pageGuard';

const log = getLogger('EntitiesHandler');

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
          .catch(err => log.error('Error in handleEntitiesUpdate:', err));
        return true;

      // Not an entities operations message
      default:
        return false;
    }
  }

  /** Mirrors ElementOpsHandler.getResponseChannel: the compiled Studies/Advisor modal answers on its own channel. */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
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
      basedOnPageId?: string;
    };

    log.debug('Entities update requested', {
      entitiesCount: data.entities.length
    });

    const channel = EntitiesHandler.getResponseChannel(msg);

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

      // Page guard (spec 2026-09-11): refuse before anything is stored.
      assertWritePage(msg.source, data.basedOnPageId, currentPage.id);

      // Update entities using ModelManager
      await modelManager.updateEntities(data.entities, currentPage);

      // The write is in storage: report success NOW. The refresh below can
      // fail on its own and must not turn a persisted write into a
      // { success: false } the panel would roll back (ClickUp 86e37z4rn).
      router.send(channel, {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.ENTITIES_UPDATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: true
        }
      });

    } catch (error) {
      log.error('Error updating entities', error);

      // Send error response
      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.ENTITIES_UPDATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });

      // A page mismatch means the panel is showing another page's data: push
      // fresh referenceData so it shows the current page. Other failures
      // behave as before.
      if (isPageMismatch(error)) {
        try {
          await SelectionHandler.sendSelectionChangedMessage(true);
        } catch (refreshError) {
          log.error('Error refreshing referenceData after a page-mismatch rejection', refreshError);
        }
      }

      return false;
    }

    // Post-write refresh, each step independent and logged on its own so a
    // failure in one neither changes the result already sent nor blocks
    // the other. Validation first (it rebuilds the definition from storage),
    // then a forced referenceData rebuild so React receives the fresh
    // entities array.
    await EntitiesHandler.refreshAfterWrite();
    return true;
  }

  private static async refreshAfterWrite(): Promise<void> {
    try {
      await ModelManager.getInstance().validateModel();
    } catch (err) {
      log.error('Error validating model after entities update:', err);
    }
    try {
      await SelectionHandler.sendSelectionChangedMessage(true);
    } catch (err) {
      log.error('Error rebuilding referenceData after entities update:', err);
    }
  }

}
