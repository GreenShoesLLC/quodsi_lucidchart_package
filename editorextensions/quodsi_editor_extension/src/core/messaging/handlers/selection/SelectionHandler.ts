import { 
  EnvelopeBase, 
  EnvelopeMessageType, 
  SelectionType
} from '@quodsi/shared';
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
import { referenceDataBuilder } from './utils/referenceDataBuilder';

/**
 * Handler for selection and document context related messages
 */
export class SelectionHandler {
  // State management delegated to specialized classes
  private static selectionState = new SelectionState();
  private static documentContext = new DocumentContext();
  private static modelManager: ModelManager | null = null;
  private static isHandlingSelectionChange = false;

  /**
   * Handle messages related to selection and document context
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.MODEL_CONTEXT:
        return SelectionHandler.documentContext.updateFromMessage(msg);
        
      case EnvelopeMessageType.SELECTION_CHANGED:
        return SelectionHandler.selectionState.updateFromMessage(msg);
        
      default:
        return false;
    }
  }
  
  /**
   * Set the model manager reference
   * @param manager The model manager instance
   */
  public static setModelManager(manager: ModelManager): void {
    SelectionHandler.modelManager = manager;
    console.log('[SelectionHandler] Model manager set');
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
    
    // Prevent concurrent processing of selection changes
    if (SelectionHandler.isHandlingSelectionChange) {
      console.log('[SelectionHandler] Already handling selection change, ignoring new event');
      return;
    }
    
    SelectionHandler.isHandlingSelectionChange = true;
    
    try {
      console.log('[SelectionHandler] Handling selection change', {
        itemCount: items.length,
        items: items.map(i => i.id)
      });
      
      // Get basic context info
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      const document = new DocumentProxy(client);
      const documentId = document.id;
      
      if (currentPage === undefined) {
        console.error('[SelectionHandler] No current page found');
        SelectionHandler.handleError('No current page found');
        return;
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
      
      console.log('[SelectionHandler] Selection type determined:', selectionType);
      
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
      console.error('[SelectionHandler] Error handling selection event:', error);
      SelectionHandler.handleError(error instanceof Error ? error.message : String(error));
    } finally {
      SelectionHandler.isHandlingSelectionChange = false;
    }
  }
  
  /**
   * Handle error in selection processing
   * @param message Error message
   * @param details Optional error details
   */
  private static handleError(message: string, details?: any): void {
    console.error('[SelectionHandler] Error:', message, details);
    
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
          console.log('[SelectionHandler] Building modelItemData for Quodsi model page');
          modelItemData = await itemDataBuilder.buildModelItemData(
            page,
            SelectionHandler.modelManager
          );
          console.log('[SelectionHandler] Built modelItemData:', {
            id: modelItemData?.id,
            hasData: !!modelItemData?.data,
            dataKeys: modelItemData?.data ? Object.keys(modelItemData.data) : []
          });
        }
      } catch (error) {
        console.error('[SelectionHandler] Error building modelItemData:', error);
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

        console.log('[SelectionHandler] Building referenceData for Quodsi model page');
        referenceData = await referenceDataBuilder.buildAllReferenceData(
          SelectionHandler.modelManager
        );
        console.log('[SelectionHandler] Built referenceData:', {
          requirementsCount: referenceData?.resourceRequirements?.length || 0,
          statesCount: referenceData?.states?.length || 0,
          resourcesCount: referenceData?.resources?.length || 0
        });
      } catch (error) {
        console.error('[SelectionHandler] Error building referenceData:', error);
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

    console.log('[SelectionHandler] Sending SELECTION_CHANGED message', {
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
    
    console.log('[SelectionHandler] State reset');
  }
}
