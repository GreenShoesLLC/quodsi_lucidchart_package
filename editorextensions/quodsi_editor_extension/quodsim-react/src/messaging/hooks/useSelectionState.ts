import { useMemo } from 'react';
import { useSelection } from '../MessageProvider';
import { useModelOpsSender } from '../senders/modelOpsSender';

/**
 * Enhanced hook for selection state that combines state and actions
 * 
 * @returns Selection state and selection-related actions
 */
export function useSelectionState() {
  const selection = useSelection();
  const { 
    updateElementData, 
    convertElement, 
    convertPage 
  } = useModelOpsSender();
  
  // Combine state and actions into a single object
  const selectionState = useMemo(() => {
    console.log('[useSelectionState] Processing selection state update', {
      hasDocumentContext: !!selection.documentContext,
      hasSelectedElements: !!selection.selectedElements?.length,
      selectionLastUpdated: selection.lastUpdated
    });
    
    // Extract document context safely
    const documentContext = selection.documentContext || {
      documentId: '',
      pageId: '',
      documentTitle: '',
      isQuodsiModel: false,
      totalElements: 0,
      metadata: {}
    };
    
    if (!selection.documentContext) {
      console.warn('[useSelectionState] Using fallback document context - original is missing');
    } else {
      console.log('[useSelectionState] Using actual document context with isQuodsiModel:', 
        selection.documentContext.isQuodsiModel);
    }

    // Calculate selection-related values
    const selectionCount = selection.selectedElements?.length || 0;
    const hasSelection = selectionCount > 0;
    const selectedElementIds = selection.selectedElements?.map(el => el.id) || [];
    const selectedElement = hasSelection ? selection.selectedElements[0] : undefined;
    
    // Get diagram element type from metadata if available
    const diagramElementType = documentContext.metadata?.diagramElementType || 'unknown';
    
    const result = {
      // Document context properties
      documentId: documentContext.documentId,
      pageId: documentContext.pageId,
      documentTitle: documentContext.documentTitle || 'Untitled Document',
      isQuodsiModel: documentContext.isQuodsiModel || false,
      
      // Selection properties
      selectedElements: selection.selectedElements || [],
      selectionCount,
      totalElementCount: documentContext.totalElements || 0,
      diagramElementType,
      lastUpdated: selection.lastUpdated,
      
      // Computed properties
      hasSelection,
      selectedElementIds,
      selectedElement,
      
      // Actions
      updateElement: (elementId: string, type: string, data: any) => 
        updateElementData(elementId, type, data),
      convertElementToType: (elementId: string, type: string) => 
        convertElement(elementId, type),
      convertCurrentPage: () => 
        convertPage()
    };
    
    console.log('[useSelectionState] Returning selection state:', {
      documentId: result.documentId,
      documentTitle: result.documentTitle,
      isQuodsiModel: result.isQuodsiModel,
      selectionCount: result.selectionCount,
      hasSelection: result.hasSelection,
      diagramElementType: result.diagramElementType,
      selectedElementId: result.selectedElement?.id
    });
    
    return result;
  }, [
    selection.selectedElements,
    selection.documentContext,
    selection.lastUpdated,
    updateElementData,
    convertElement,
    convertPage
  ]);
  
  return selectionState;
}
