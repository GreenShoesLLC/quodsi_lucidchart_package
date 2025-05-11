/**
 * Selection State Slice
 * Manages the selection of elements and document context
 */

import { ElementShape } from './types';

// State shape
export interface SelectionState {
  selectedElements: ElementShape[];
  documentContext?: {
    documentId: string;
    pageId: string;
    documentTitle: string;
    isQuodsiModel: boolean;
    totalElements: number;
    metadata?: Record<string, any>;
  };
  lastUpdated?: number;
}

// Initial state
export const initialSelectionState: SelectionState = {
  selectedElements: [],
  documentContext: undefined,
  lastUpdated: undefined,
};

// Action types
export type SelectionAction = 
  | { type: 'SELECTION_UPDATE'; elements: ElementShape[]; totalElements: number }
  | { type: 'DOCUMENT_CONTEXT_UPDATE'; documentId: string; pageId: string; documentTitle: string; isQuodsiModel: boolean; metadata?: Record<string, any> };

// Reducer
export function selectionReducer(state: SelectionState = initialSelectionState, action: SelectionAction): SelectionState {
  console.log('[selectionReducer] Received action:', action.type, action);
  console.log('[selectionReducer] Current state:', {
    hasSelectedElements: state.selectedElements?.length > 0,
    firstSelectedElementId: state.selectedElements[0]?.id,
    hasDocumentContext: !!state.documentContext,
    isQuodsiModel: state.documentContext?.isQuodsiModel
  });
  switch (action.type) {
    case 'SELECTION_UPDATE':
      // If the first element has document information, create/update document context
      const firstElement = action.elements[0];
      let documentContext = state.documentContext;
      
      // Check if we have a document ID in the data and need to create a document context
      if (firstElement && !documentContext) {
        console.log('[selectionReducer] Creating document context from selection data');
        // Create a new document context from the selection data
        // This is the key fix - we need to create a document context with isQuodsiModel=true
        documentContext = {
          documentId: firstElement.id.split('-')[0], // Use the first part of ID as document ID
          pageId: '', // Empty for now, will be updated later if available
          documentTitle: 'Document', // Default title
          isQuodsiModel: true, // CRITICAL: Force isQuodsiModel to true since we have an element
          totalElements: action.totalElements,
          metadata: {}
        };
      }
      
      const updatedState = {
        ...state,
        selectedElements: action.elements,
        documentContext: documentContext ? {
          ...documentContext,
          totalElements: action.totalElements,
          // CRITICAL: Always ensure isQuodsiModel is true when we have selected elements
          isQuodsiModel: true
        } : undefined,
        lastUpdated: Date.now(),
      };
      
      console.log('[selectionReducer] SELECTION_UPDATE - Updated state:', {
        selectedElementsCount: updatedState.selectedElements.length,
        firstElementId: updatedState.selectedElements[0]?.id,
        firstElementType: updatedState.selectedElements[0]?.type,
        hasDocumentContext: !!updatedState.documentContext,
        isQuodsiModel: updatedState.documentContext?.isQuodsiModel
      });
      
      return updatedState;
    case 'DOCUMENT_CONTEXT_UPDATE':
      const updatedContextState = {
        ...state,
        documentContext: {
          documentId: action.documentId,
          pageId: action.pageId,
          documentTitle: action.documentTitle,
          isQuodsiModel: action.isQuodsiModel,
          totalElements: state.documentContext?.totalElements || 0,
          metadata: action.metadata,
        },
        lastUpdated: Date.now(),
      };
      
      console.log('[selectionReducer] DOCUMENT_CONTEXT_UPDATE - Updated state:', {
        documentId: updatedContextState.documentContext.documentId,
        documentTitle: updatedContextState.documentContext.documentTitle,
        isQuodsiModel: updatedContextState.documentContext.isQuodsiModel,
        totalElements: updatedContextState.documentContext.totalElements,
        hasMetadata: !!updatedContextState.documentContext.metadata
      });
      
      return updatedContextState;
    default:
      // Type assertion to handle the 'never' type in the default case
      console.log('[selectionReducer] Unhandled action type:', (action as any).type);
      return state;
  }
}
