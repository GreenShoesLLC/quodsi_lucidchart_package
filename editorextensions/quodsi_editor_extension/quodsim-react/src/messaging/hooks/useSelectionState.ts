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
  const selectionState = useMemo(() => ({
    // State
    documentId: selection.documentId,
    pageId: selection.pageId,
    isQuodsiModel: selection.isQuodsiModel,
    selectedElements: selection.selectedElements,
    selectionCount: selection.selectionCount,
    totalElementCount: selection.totalElementCount,
    diagramElementType: selection.diagramElementType,
    
    // Computed properties
    hasSelection: selection.selectionCount > 0,
    selectedElementIds: selection.selectedElements.map(el => el.id),
    selectedElement: selection.selectedElements[0],
    
    // Actions
    updateElement: (elementId: string, type: string, data: any) => 
      updateElementData(elementId, type, data),
    convertElementToType: (elementId: string, type: string) => 
      convertElement(elementId, type),
    convertCurrentPage: () => 
      convertPage()
  }), [
    selection.documentId,
    selection.pageId,
    selection.isQuodsiModel,
    selection.selectedElements,
    selection.selectionCount,
    selection.totalElementCount,
    selection.diagramElementType,
    updateElementData,
    convertElement,
    convertPage
  ]);
  
  return selectionState;
}
