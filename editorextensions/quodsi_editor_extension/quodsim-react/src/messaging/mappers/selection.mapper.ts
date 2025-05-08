import { ElementShape, EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';

/**
 * Maps selection and document context messages to reducer actions
 * 
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapSelection(msg: EnvelopeBase): MessagingAction | null {
  // Skip messages that aren't selection-related
  if (
    msg.type !== EnvelopeMessageType.MODEL_CONTEXT &&
    msg.type !== EnvelopeMessageType.SELECTION_CHANGED
  ) {
    return null;
  }

  debugService.debug(`Selection mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.MODEL_CONTEXT:
      // Extract model context data
      const contextData = msg.data as {
        documentId: string;
        title: string;
        pageId: string;
        isQuodsiModel: boolean;
        metadata?: Record<string, unknown>;
      };

      // Map to document context update action
      return {
        type: 'DOCUMENT_CONTEXT_UPDATE',
        documentId: contextData.documentId,
        pageId: contextData.pageId,
        documentTitle: contextData.title,
        isQuodsiModel: contextData.isQuodsiModel,
        metadata: contextData.metadata
      };

    case EnvelopeMessageType.SELECTION_CHANGED:
      // Extract selection changed data
      const selectionData = msg.data as {
        selectionType: string;
        documentId: string;
        hasModel: boolean;
        selectionState: {
          pageId: string;
          selectedIds: string[];
          selectionType: string;
        };
        modelItemData?: any;
        diagramElementType?: string;
        validationResult?: any;
      };

      // Create elements array from model item data
      const elements = selectionData.modelItemData 
        ? [selectionData.modelItemData] as ElementShape[]
        : [] as ElementShape[];

      // Map to selection update action
      return {
        type: 'SELECTION_UPDATE',
        elements: elements,
        totalElements: selectionData.selectionState.selectedIds.length || 0
      };

    default:
      return null;
  }
}
