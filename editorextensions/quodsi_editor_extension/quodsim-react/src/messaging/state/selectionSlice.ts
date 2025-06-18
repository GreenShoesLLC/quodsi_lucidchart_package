/**
 * Selection State Slice
 * Manages the selection of elements and document context
 */

import { ElementShape } from './types';
import { debugService } from '../utils/debugService';

// Create component-specific logger
const logger = debugService.forComponent('SelectionSlice');

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
  | { type: 'SELECTION_UPDATE'; elements: ElementShape[]; totalElements: number; documentContext?: { documentId: string; pageId: string; documentTitle: string; isQuodsiModel: boolean; metadata?: Record<string, any> } }
  | { type: 'DOCUMENT_CONTEXT_UPDATE'; documentId: string; pageId: string; documentTitle: string; isQuodsiModel: boolean; metadata?: Record<string, any> };

// Reducer
export function selectionReducer(state: SelectionState = initialSelectionState, action: SelectionAction): SelectionState {
  logger.debug('Received action:', action.type, action);
  logger.debug('Current state:', {
    hasSelectedElements: state.selectedElements?.length > 0,
    firstSelectedElementId: state.selectedElements[0]?.id,
    hasDocumentContext: !!state.documentContext,
    isQuodsiModel: state.documentContext?.isQuodsiModel
  });
  switch (action.type) {
    case 'SELECTION_UPDATE':
      // Prioritize embedded document context if present, otherwise use existing or create from selection
      let documentContext = state.documentContext;
      
      // If we have embedded document context in the action, use it
      if (action.documentContext) {
        logger.debug('Using embedded document context from SELECTION_UPDATE action');
        documentContext = {
          ...action.documentContext,
          totalElements: action.totalElements, // Update total elements from selection
        };
      }
      // Otherwise, if the first element has document information and we don't have context, create it
      else {
        const firstElement = action.elements[0];
        if (firstElement && !documentContext) {
          logger.debug('Creating document context from selection data');
          // Create a new document context from the selection data
          // Don't assume isQuodsiModel=true just because an element exists
          documentContext = {
            documentId: firstElement.id.split('-')[0], // Use the first part of ID as document ID
            pageId: '', // Empty for now, will be updated later if available
            documentTitle: 'Document', // Default title
            isQuodsiModel: false, // Default to false - will be set correctly by MODEL_CONTEXT message
            totalElements: action.totalElements,
            metadata: {}
          };
        }
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
      
      logger.log('SELECTION_UPDATE - Updated state:', {
        selectedElementsCount: updatedState.selectedElements.length,
        firstElementId: updatedState.selectedElements[0]?.id,
        firstElementType: updatedState.selectedElements[0]?.type,
        hasDocumentContext: !!updatedState.documentContext,
        isQuodsiModel: updatedState.documentContext?.isQuodsiModel,
        documentId: updatedState.documentContext?.documentId,
        documentTitle: updatedState.documentContext?.documentTitle,
        hasEmbeddedContext: !!action.documentContext,
        embeddedContextIsQuodsiModel: action.documentContext?.isQuodsiModel
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
      
      logger.log('DOCUMENT_CONTEXT_UPDATE - Updated state:', {
        documentId: updatedContextState.documentContext.documentId,
        documentTitle: updatedContextState.documentContext.documentTitle,
        isQuodsiModel: updatedContextState.documentContext.isQuodsiModel,
        totalElements: updatedContextState.documentContext.totalElements,
        hasMetadata: !!updatedContextState.documentContext.metadata
      });
      
      return updatedContextState;
    default:
      // Type assertion to handle the 'never' type in the default case
      logger.warn('Unhandled action type:', (action as any).type);
      return state;
  }
}
