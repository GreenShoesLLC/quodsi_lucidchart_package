import { 
  EnvelopeBase, 
  ElementShape, 
  ModelItemData, 
  ValidationResult, 
  EditorReferenceData, 
  DiagramElementType, 
  SelectionType,
  SelectionState as SharedSelectionState
} from '@quodsi/shared';
import { SelectionStateData } from '../types';

/**
 * Manages selection state data
 */
export class SelectionState {
  private state: SelectionStateData = {
    selectedElements: [],
    selectionCount: 0,
    totalElementCount: 0,
    selectionType: SelectionType.NONE,
    selectionState: {
      pageId: '',
      selectedIds: [],
      selectionType: SelectionType.NONE
    },
    documentId: '',
    hasModel: false
  };
  
  /**
   * Update state from a message
   * @param msg The envelope message to process
   * @returns true if successful, false otherwise
   */
  public updateFromMessage(msg: EnvelopeBase): boolean {
    try {
      const data = msg.data as Partial<SelectionStateData>;
      
      // Update state with message data
      this.state = {
        ...this.state,
        ...data
      };
      
      console.log('[SelectionState] Updated from message:', {
        selectionType: this.state.selectionType,
        selectionCount: this.state.selectionCount
      });
      
      return true;
    } catch (error) {
      console.error('[SelectionState] Error updating from message:', error);
      return false;
    }
  }
  
  /**
   * Update state with new data
   * @param data The data to update state with
   */
  public update(data: Partial<SelectionStateData>): void {
    this.state = {
      ...this.state,
      ...data
    };
    
    console.log('[SelectionState] Updated state:', {
      selectionType: this.state.selectionType,
      selectionCount: this.state.selectionCount,
      hasModel: this.state.hasModel
    });
  }
  
  /**
   * Get a copy of the current state
   * @returns Copy of the current state
   */
  public getData(): SelectionStateData {
    return { ...this.state };
  }
  
  /**
   * Reset the state to its initial values
   */
  public reset(): void {
    this.state = {
      selectedElements: [],
      selectionCount: 0,
      totalElementCount: 0,
      selectionType: SelectionType.NONE,
      selectionState: {
        pageId: '',
        selectedIds: [],
        selectionType: SelectionType.NONE
      },
      documentId: '',
      hasModel: false
    };
    
    console.log('[SelectionState] State reset');
  }
  
  /**
   * Set error information
   * @param message Error message
   * @param details Optional error details
   */
  public setError(message: string, details?: any): void {
    this.state = {
      ...this.state,
      error: message,
      errorDetails: details
    };
    
    console.error('[SelectionState] Error set:', message);
  }
  
  /**
   * Set processing state
   * @param isProcessing Whether processing is in progress
   */
  public setProcessing(isProcessing: boolean): void {
    this.state = {
      ...this.state,
      isProcessing
    };
  }
}
