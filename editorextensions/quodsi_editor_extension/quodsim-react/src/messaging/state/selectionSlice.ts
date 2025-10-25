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
  diagramElementType?: string; // 'block' or 'line' from extension
  documentContext?: {
    documentId: string;
    pageId: string;
    documentTitle: string;
    isQuodsiModel: boolean;
    totalElements: number;
    metadata?: Record<string, any>;
  };
  referenceData?: {
    activities?: Array<{ id: string; name: string }>;
    resources?: Array<{ id: string; name: string }>;
    entities?: Array<{ id: string; name: string }>;
    resourceRequirements?: any[];
    connectors?: any[];
    states?: any[]; // Now included in referenceData instead of separate field
  };
  outgoingConnectors?: any[];
  lastUpdated?: number;
}

// Initial state
export const initialSelectionState: SelectionState = {
  selectedElements: [],
  diagramElementType: undefined,
  documentContext: undefined,
  referenceData: undefined,
  outgoingConnectors: undefined,
  lastUpdated: undefined,
};

// Action types
export type SelectionAction =
  | { type: 'SELECTION_UPDATE'; elements: ElementShape[]; totalElements: number; diagramElementType?: string; documentContext?: { documentId: string; pageId: string; documentTitle: string; isQuodsiModel: boolean; metadata?: Record<string, any> }; referenceData?: { activities?: Array<{ id: string; name: string }>; resources?: Array<{ id: string; name: string }>; entities?: Array<{ id: string; name: string }>; resourceRequirements?: any[]; connectors?: any[]; states?: any[]; }; outgoingConnectors?: any[]; }
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
        diagramElementType: action.diagramElementType || state.diagramElementType,
        documentContext: documentContext ? {
          ...documentContext,
          totalElements: action.totalElements,
          // Preserve the actual isQuodsiModel value from the document context
          isQuodsiModel: documentContext.isQuodsiModel
        } : undefined,
        referenceData: action.referenceData || state.referenceData,
        outgoingConnectors: action.outgoingConnectors || state.outgoingConnectors,
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
        embeddedContextIsQuodsiModel: action.documentContext?.isQuodsiModel,
        hasReferenceData: !!updatedState.referenceData,
        referenceDataSummary: updatedState.referenceData ? {
          activities: updatedState.referenceData.activities?.length || 0,
          resources: updatedState.referenceData.resources?.length || 0,
          entities: updatedState.referenceData.entities?.length || 0,
          connectors: updatedState.referenceData.connectors?.length || 0,
          states: updatedState.referenceData.states?.length || 0,
          resourceRequirements: updatedState.referenceData.resourceRequirements?.length || 0
        } : 'none',
        outgoingConnectorsCount: updatedState.outgoingConnectors?.length || 0
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
      // Silently ignore actions that aren't selection-related
      // Only log warnings for actions that should be handled by this slice
      const actionType = (action as any).type;
      if (actionType && (actionType.includes('SELECTION') || actionType.includes('DOCUMENT_CONTEXT'))) {
        logger.warn('Unhandled selection action type:', actionType);
      }
      return state;
  }
}
