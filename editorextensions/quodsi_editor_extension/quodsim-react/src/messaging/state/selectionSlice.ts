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
  switch (action.type) {
    case 'SELECTION_UPDATE':
      return {
        ...state,
        selectedElements: action.elements,
        documentContext: state.documentContext ? {
          ...state.documentContext,
          totalElements: action.totalElements,
        } : undefined,
        lastUpdated: Date.now(),
      };
    case 'DOCUMENT_CONTEXT_UPDATE':
      return {
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
    default:
      return state;
  }
}
