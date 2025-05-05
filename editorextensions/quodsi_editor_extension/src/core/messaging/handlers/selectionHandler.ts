import { EnvelopeBase, EnvelopeMessageType, ElementShape } from '@quodsi/shared';
import { router } from '../index';

/**
 * Handler for selection and document context related messages
 */
export class SelectionHandler {
  /**
   * Current document context information
   */
  private static documentContext: {
    documentId?: string;
    pageId?: string;
    title?: string;
    isQuodsiModel: boolean;
    metadata?: Record<string, unknown>;
  } = {
    isQuodsiModel: false
  };

  /**
   * Current selection state
   */
  private static selectionState: {
    selectedElements: ElementShape[];
    selectionCount: number;
    totalElementCount: number;
  } = {
    selectedElements: [],
    selectionCount: 0,
    totalElementCount: 0
  };

  /**
   * Handle messages related to selection and document context
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.MODEL_CONTEXT:
        return SelectionHandler.handleModelContext(msg);
        
      case EnvelopeMessageType.SELECTION_CHANGED:
        return SelectionHandler.handleSelectionChanged(msg);
        
      // Not a selection message
      default:
        return false;
    }
  }
  
  /**
   * Handle document context update
   * 
   * @param msg MODEL_CONTEXT message
   * @returns True indicating message was handled
   */
  private static handleModelContext(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      documentId: string;
      title: string;
      pageId: string;
      isQuodsiModel: boolean;
      metadata?: Record<string, unknown>;
    };
    
    console.log('[SelectionHandler] Document context updated', {
      documentId: data.documentId,
      title: data.title,
      isQuodsiModel: data.isQuodsiModel
    });
    
    // Update stored context
    SelectionHandler.documentContext = data;
    
    // Notify any services that depend on document context
    // ...
    
    return true;
  }
  
  /**
   * Handle selection changed notification
   * 
   * @param msg SELECTION_CHANGED message
   * @returns True indicating message was handled
   */
  private static handleSelectionChanged(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      selectedElements: ElementShape[];
      selectionCount: number;
      totalElementCount: number;
    };
    
    console.log('[SelectionHandler] Selection changed', {
      count: data.selectionCount,
      total: data.totalElementCount
    });
    
    // Update stored selection
    SelectionHandler.selectionState = data;
    
    // Notify any services that depend on selection state
    // ...
    
    return true;
  }
  
  /**
   * Get the current document context
   */
  public static getDocumentContext() {
    return { ...SelectionHandler.documentContext };
  }
  
  /**
   * Get the current selection state
   */
  public static getSelectionState() {
    return { ...SelectionHandler.selectionState };
  }
  
  /**
   * Set the document context from another source (e.g., Lucid API)
   */
  public static setDocumentContext(
    documentId: string,
    pageId: string,
    title: string,
    isQuodsiModel: boolean,
    metadata?: Record<string, unknown>
  ) {
    SelectionHandler.documentContext = {
      documentId,
      pageId,
      title,
      isQuodsiModel,
      metadata
    };
    
    // Broadcast to panels
    router.send('broadcast', {
      id: '',
      type: EnvelopeMessageType.MODEL_CONTEXT,
      source: 'host',
      target: 'broadcast',
      version: '1.0',
      data: SelectionHandler.documentContext
    });
  }
  
  /**
   * Set the selection state from another source (e.g., Lucid API)
   */
  public static setSelectionState(
    selectedElements: ElementShape[],
    totalElementCount: number
  ) {
    SelectionHandler.selectionState = {
      selectedElements,
      selectionCount: selectedElements.length,
      totalElementCount
    };
    
    // Broadcast to panels
    router.send('model', {
      id: '',
      type: EnvelopeMessageType.SELECTION_CHANGED,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: SelectionHandler.selectionState
    });
  }
}
