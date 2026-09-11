import { EnvelopeBase, EnvelopeMessageType, ISerializedResourceRequirement, getLogger } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport, PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { SelectionHandler } from './selection/SelectionHandler';
import { assertWritePage, isPageMismatch } from '../pageGuard';

const log = getLogger('ResourceRequirementsHandler');

/**
 * Handler for resource requirements operations (update resource requirements array)
 */
export class ResourceRequirementsHandler {
  /**
   * Handle messages related to resource requirements operations
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE:
        // Start the async process but return true synchronously
        ResourceRequirementsHandler.handleResourceRequirementsUpdate(msg)
          .catch(err => log.error('Error in handleResourceRequirementsUpdate:', err));
        return true;

      case EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE_RESULT:
        return ResourceRequirementsHandler.handleResourceRequirementsUpdateResult(msg);

      // Not a resource requirements operations message
      default:
        return false;
    }
  }

  /**
   * Handle resource requirements update request
   *
   * @param msg RESOURCE_REQUIREMENTS_UPDATE message
   * @returns True indicating message was handled
   */
  private static async handleResourceRequirementsUpdate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      resourceRequirements: ISerializedResourceRequirement[];
      basedOnPageId?: string;
    };

    log.debug('Resource requirements update requested', {
      requirementsCount: data.resourceRequirements.length
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

      // Page guard (spec 2026-09-11): refuse before anything is stored.
      assertWritePage(msg.source, data.basedOnPageId, currentPage.id);

      // Update resource requirements using ModelManager
      await modelManager.updateResourceRequirements(data.resourceRequirements, currentPage);

      // Validate the model after update
      await modelManager.validateModel();

      // Trigger a selection change to send updated resource requirements back to React
      // This ensures React gets the fresh resource requirements array
      // IMPORTANT: Force rebuild of referenceData to ensure React receives updated requirements
      await SelectionHandler.sendSelectionChangedMessage(true);

      // Send success response
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true
        }
      });

      return true;

    } catch (error) {
      log.error('Error updating resource requirements', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
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
  }

  /**
   * Handle resource requirements update result
   *
   * @param msg RESOURCE_REQUIREMENTS_UPDATE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleResourceRequirementsUpdateResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      errorMessage?: string;
    };

    log.debug('Resource requirements update result received', {
      success: data.success,
      error: data.errorMessage
    });

    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness

    return true;
  }
}
