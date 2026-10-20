import {
    EnvelopeMessageType,
} from '@quodsi/lucid-shared';
import { SelectionType } from './types';
import { 
  EditorClient, 
  ItemProxy, 
  ElementProxy,
  DocumentProxy,
  Viewport,
  PageProxy
} from 'lucid-extension-sdk';
import { router } from '../../index';

import { SelectionState } from './state/SelectionState';
import { DocumentContext } from './state/DocumentContext';
import { ProcessorFactory } from './processors/ProcessorFactory';
import { selectionTypeUtils } from './utils/selectionTypeUtils';
import { SelectionStateData } from './types';
import { ModelManager } from '../../../ModelManager';
import { itemDataBuilder } from './utils/itemDataBuilder';
import { AnalyticsHandler } from '../analyticsHandler';
import { referenceDataBuilder } from './utils/referenceDataBuilder';
import { getLogger } from '@quodsi/lucid-shared';

const log = getLogger('SelectionHandler');

/**
 * Handler for selection and document context related messages
 */
export class SelectionHandler {
  // State management delegated to specialized classes
  private static selectionState = new SelectionState();
  private static documentContext = new DocumentContext();
  private static modelManager: ModelManager | null = null;
  private static isHandlingSelectionChange = false;
  /** The latest event that arrived while another was being processed. */
  private static pendingSelection: {
    client: EditorClient;
    items: ItemProxy[];
    modelManager?: ModelManager;
  } | null = null;

  /**
   * Set the model manager reference
   * @param manager The model manager instance
   */
  public static setModelManager(manager: ModelManager): void {
    SelectionHandler.modelManager = manager;
  }
  
  /**
   * Get the current modelManager or throw an error if not set
   */
  private static getModelManager(): ModelManager {
    if (!SelectionHandler.modelManager) {
      throw new Error('Model manager not set in SelectionHandler');
    }
    return SelectionHandler.modelManager;
  }

  /**
   * Handle a selection event from Lucid
   * @param client The editor client
   * @param items The selected items
   * @param modelManager Optional model manager (uses stored one if not provided)
   */
  public static async handleLucidSelectionEvent(
    client: EditorClient,
    items: ItemProxy[],
    modelManager?: ModelManager
  ): Promise<void> {
    // Use the provided model manager or the stored one
    const manager = modelManager || SelectionHandler.getModelManager();
    
    // Process one selection change at a time. An event that arrives
    // mid-processing is kept (only the latest -- it supersedes any earlier
    // one) and run when the current one finishes. Dropping it left the panel
    // on the previous page's data after a page switch (ClickUp 86e37z4q3).
    if (SelectionHandler.isHandlingSelectionChange) {
      SelectionHandler.pendingSelection = { client, items, modelManager };
      return;
    }

    SelectionHandler.isHandlingSelectionChange = true;

    try {
      log.trace('Handling selection change', {
        itemCount: items.length,
        items: items.map(i => i.id)
      });
      
      // Get basic context info
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      const document = new DocumentProxy(client);
      const documentId = document.id;
      
      if (currentPage === undefined) {
        log.error('No current page found');
        SelectionHandler.handleError('No current page found');
        return;
      }

      // Page guard (spec 2026-09-11): keep ModelManager on the page Lucid is
      // showing. Several processors (None/Resource/SwimLane/Multiple) never
      // set it, so after a page switch with nothing selected referenceData was
      // built -- and stamped -- from the previous page. The rebuild diff is
      // page-scoped, so switching here runs no cross-page cleanup.
      if (manager.getCurrentPageId() !== currentPage.id) {
        manager.setCurrentPage(currentPage);
      }

      // Update document context
      const isQuodsiModel = manager.isQuodsiModel(currentPage);
      SelectionHandler.documentContext.update(
        documentId,
        currentPage.id,
        currentPage.getTitle?.() || document.getTitle() || 'Untitled',
        isQuodsiModel
      );
      
      // Determine selection type
      const selectionType = await selectionTypeUtils.determineSelectionType(
        items, 
        manager
      );
      
      log.trace('Selection type determined:', selectionType);
      
      // Get appropriate processor for this selection type
      const processor = ProcessorFactory.createProcessor(selectionType);
      
      // Process selection and get message data
      const messageData = await processor.process(
        client,
        currentPage,
        items,
        selectionType,
        manager
      );
      
      // Update selection state with processed data
      SelectionHandler.selectionState.update(messageData);
      
      // Send message to React app
      SelectionHandler.sendSelectionChangedMessage();
      
    } catch (error) {
      log.error('Error handling selection event:', error);
      SelectionHandler.handleError(error instanceof Error ? error.message : String(error));
    } finally {
      SelectionHandler.isHandlingSelectionChange = false;
      // In `finally`, not after it: the try block returns early on some paths
      // (no current page), and a queued event must still run then.
      const pending = SelectionHandler.pendingSelection;
      if (pending) {
        SelectionHandler.pendingSelection = null;
        await SelectionHandler.handleLucidSelectionEvent(pending.client, pending.items, pending.modelManager);
      }
    }
  }
  
  /**
   * Handle error in selection processing
   * @param message Error message
   * @param details Optional error details
   */
  private static handleError(message: string, details?: any): void {
    log.error('Error:', message, details);
    
    // Set error in selection state
    SelectionHandler.selectionState.setError(message, details);
    
    // Send error message
    SelectionHandler.sendSelectionChangedMessage();
  }
  
  /**
   * Send current selection state to React app
   * @param forceRebuild - Force rebuild of referenceData even if it already exists (useful after updates)
   */
  public static async sendSelectionChangedMessage(forceRebuild: boolean = false): Promise<void> {
    // Get data from both state managers
    const selectionData = SelectionHandler.selectionState.getData();
    const documentData = SelectionHandler.documentContext.getData();

    // NOTE: states and resourceRequirements are now included in referenceData
    // They are built by referenceDataBuilder.buildAllReferenceData() from ModelDefinition
    // This eliminates duplicate retrieval and centralizes all reference data

    // Build modelItemData for Quodsi model pages when not already present
    let modelItemData = selectionData.modelItemData;
    if (documentData.isQuodsiModel && !modelItemData && SelectionHandler.modelManager) {
      try {
        const client = ModelManager.getClient();
        const viewport = new Viewport(client);
        const page = viewport.getCurrentPage();

        if (page) {
          modelItemData = await itemDataBuilder.buildModelItemData(
            page,
            SelectionHandler.modelManager
          );
        }
      } catch (error) {
        log.error('Error building modelItemData:', error);
      }
    }

    // Build referenceData for Quodsi model pages when not already present or when forced
    let referenceData = selectionData.referenceData;
    if (documentData.isQuodsiModel && (!referenceData || forceRebuild) && SelectionHandler.modelManager) {
      try {
        // Ensure ModelManager has currentPage set before building reference data
        // This is critical for initial panel load where currentPage isn't set yet
        const client = ModelManager.getClient();
        const viewport = new Viewport(client);
        const page = viewport.getCurrentPage();

        if (page) {
          SelectionHandler.modelManager.setCurrentPage(page);
        }

        referenceData = await referenceDataBuilder.buildAllReferenceData(
          SelectionHandler.modelManager
        );
        // Cache what we just built. A forced rebuild follows a write (e.g. a
        // state delete); without this the next non-forced send -- panel
        // reopen via setSelectionState -- re-sends the pre-write copy and the
        // deleted item reappears (ClickUp 86e37z4nq).
        if (referenceData) {
          SelectionHandler.selectionState.update({ referenceData });
        }
      } catch (error) {
        log.error('Error building referenceData:', error);
      }
    }

    // Combine data for the message
    // Note: states and resourceRequirements are now in referenceData
    const messageData: any = {
      ...selectionData,
      documentContext: documentData,
      ...(modelItemData ? { modelItemData } : {}),
      ...(referenceData ? { referenceData } : {})
    };

    log.trace('Sending SELECTION_CHANGED message', {
      selectionType: messageData.selectionType,
      hasModel: messageData.hasModel,
      itemCount: messageData.selectionCount,
      hasReferenceData: !!messageData.referenceData,
      statesCount: messageData.referenceData?.states?.length || 0,
      requirementsCount: messageData.referenceData?.resourceRequirements?.length || 0,
      hasModelItemData: !!messageData.modelItemData,
      modelItemDataId: messageData.modelItemData?.id
    });

    // Send message via router
    router.send('model', {
      id: `selection_change_${Date.now()}`,
      type: EnvelopeMessageType.SELECTION_CHANGED,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: messageData
    });
  }
  
  /**
   * Get the current document context
   * @returns Current document context data
   */
  public static getDocumentContext() {
    return SelectionHandler.documentContext.getData();
  }
  
  /**
   * Get the current selection state
   * @returns Current selection state data
   */
  public static getSelectionState() {
    return SelectionHandler.selectionState.getData();
  }
  
  /**
   * Set the document context from an external source
   * @param documentId Document ID
   * @param pageId Page ID
   * @param title Document title
   * @param isQuodsiModel Whether this is a Quodsi model
   * @param metadata Optional metadata
   */
  public static setDocumentContext(
    documentId: string,
    pageId: string,
    title: string,
    isQuodsiModel: boolean,
    metadata?: Record<string, unknown>
  ): void {
    SelectionHandler.documentContext.update(
      documentId,
      pageId,
      title,
      isQuodsiModel,
      metadata
    );

    // Fire model_opened once per unique model_id per session.
    if (isQuodsiModel && documentId) {
      AnalyticsHandler.fireModelOpenedIfNew(documentId);
    }

    // Send updated context to React
    SelectionHandler.sendSelectionChangedMessage();
  }
  
  /**
   * Set the selection state from an external source
   * @param data Selection state data
   */
  public static setSelectionState(data: Partial<SelectionStateData>): void {
    SelectionHandler.selectionState.update(data);
    
    // Send updated state to React
    SelectionHandler.sendSelectionChangedMessage();
  }
  
  /**
   * Reset all state (for testing or recovery)
   */
  public static reset(): void {
    SelectionHandler.selectionState.reset();
    SelectionHandler.isHandlingSelectionChange = false;
    SelectionHandler.pendingSelection = null;
  }
}
