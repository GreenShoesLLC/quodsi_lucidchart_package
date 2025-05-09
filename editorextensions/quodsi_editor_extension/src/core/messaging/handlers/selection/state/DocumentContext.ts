import { EnvelopeBase } from '@quodsi/shared';
import { DocumentContextData } from '../types';

/**
 * Manages document context information
 */
export class DocumentContext {
  private context: DocumentContextData = {
    isQuodsiModel: false
  };
  
  /**
   * Update context from a message
   * @param msg The envelope message to process
   * @returns true if successful, false otherwise
   */
  public updateFromMessage(msg: EnvelopeBase): boolean {
    try {
      const data = msg.data as Partial<DocumentContextData>;
      
      // Update context with message data
      this.context = {
        ...this.context,
        ...data
      };
      
      console.log('[DocumentContext] Updated from message:', {
        documentId: this.context.documentId,
        pageId: this.context.pageId,
        isQuodsiModel: this.context.isQuodsiModel
      });
      
      return true;
    } catch (error) {
      console.error('[DocumentContext] Error updating from message:', error);
      return false;
    }
  }
  
  /**
   * Update context with new data
   * @param documentId Document ID
   * @param pageId Page ID
   * @param title Document title
   * @param isQuodsiModel Whether this is a Quodsi model
   * @param metadata Optional metadata
   */
  public update(
    documentId: string,
    pageId: string,
    title: string,
    isQuodsiModel: boolean,
    metadata?: Record<string, unknown>
  ): void {
    this.context = {
      documentId,
      pageId,
      title,
      isQuodsiModel,
      metadata: metadata || this.context.metadata
    };
    
    console.log('[DocumentContext] Updated context:', {
      documentId,
      pageId,
      isQuodsiModel
    });
  }
  
  /**
   * Get a copy of the current context
   * @returns Copy of the current context
   */
  public getData(): DocumentContextData {
    return { ...this.context };
  }
  
  /**
   * Get whether the current document is a Quodsi model
   * @returns true if the document is a Quodsi model, false otherwise
   */
  public isQuodsiModel(): boolean {
    return this.context.isQuodsiModel;
  }
  
  /**
   * Get the document ID
   * @returns The document ID, or undefined if not set
   */
  public getDocumentId(): string | undefined {
    return this.context.documentId;
  }
  
  /**
   * Get the page ID
   * @returns The page ID, or undefined if not set
   */
  public getPageId(): string | undefined {
    return this.context.pageId;
  }
}
