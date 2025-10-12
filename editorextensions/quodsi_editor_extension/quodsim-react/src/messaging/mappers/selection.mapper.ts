import { ElementShape, EnvelopeBase, EnvelopeMessageType, SimulationObjectType, DiagramElementType, ISerializedState } from '@quodsi/shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';
import { ExtendedModelItemData } from '../../types/ModelItemData';

// Create component-specific logger
const logger = debugService.forComponent('SelectionMapper');

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

  logger.debug(`Processing message: ${msg.type}`, {
    msgType: msg.type,
    msgId: msg.id,
    msgSource: msg.source,
    msgTarget: msg.target,
    msgData: msg.data
  });

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

      logger.log('MODEL_CONTEXT details:', {
        documentId: contextData.documentId,
        title: contextData.title,
        pageId: contextData.pageId,
        isQuodsiModel: contextData.isQuodsiModel,
        hasMetadata: !!contextData.metadata
      });

      // Map to document context update action
      const contextAction = {
        type: 'DOCUMENT_CONTEXT_UPDATE' as const,
        documentId: contextData.documentId,
        pageId: contextData.pageId,
        documentTitle: contextData.title,
        isQuodsiModel: contextData.isQuodsiModel,
        metadata: contextData.metadata
      };
      
      logger.debug('Returning DOCUMENT_CONTEXT_UPDATE action:', contextAction);
      return contextAction;

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
        referenceData?: {
          activities?: Array<{ id: string; name: string }>;
          resources?: Array<{ id: string; name: string }>;
          entities?: Array<{ id: string; name: string }>;
          resourceRequirements?: any[];
          connectors?: any[];
        };
        states?: ISerializedState[];
        resourceRequirements?: any[];
        outgoingConnectors?: any[];
        documentContext?: {
          documentId: string;
          pageId: string;
          title: string;
          isQuodsiModel: boolean;
          metadata?: Record<string, unknown>;
        };
      };
      
      console.log('[SelectionMapper] SELECTION_CHANGED referenceData check:', {
        hasReferenceData: !!selectionData.referenceData,
        referenceDataKeys: selectionData.referenceData ? Object.keys(selectionData.referenceData) : [],
        resourcesCount: selectionData.referenceData?.resources?.length || 0,
        resourceRequirementsCount: selectionData.referenceData?.resourceRequirements?.length || 0,
        connectorsCount: selectionData.referenceData?.connectors?.length || 0,
        outgoingConnectorsCount: selectionData.outgoingConnectors?.length || 0,
        rawReferenceData: selectionData.referenceData
      });

      logger.log('SELECTION_CHANGED details:', {
        selectionType: selectionData.selectionType,
        documentId: selectionData.documentId,
        hasModel: selectionData.hasModel,
        selectionState: selectionData.selectionState,
        hasModelItemData: !!selectionData.modelItemData,
        diagramElementType: selectionData.diagramElementType,
        hasValidationResult: !!selectionData.validationResult,
        hasDocumentContext: !!selectionData.documentContext,
        documentContextIsQuodsiModel: selectionData.documentContext?.isQuodsiModel,
        hasReferenceData: !!selectionData.referenceData,
        referenceDataSummary: selectionData.referenceData ? {
          activities: selectionData.referenceData.activities?.length || 0,
          resources: selectionData.referenceData.resources?.length || 0,
          entities: selectionData.referenceData.entities?.length || 0,
          resourceRequirements: selectionData.referenceData.resourceRequirements?.length || 0,
          connectors: selectionData.referenceData.connectors?.length || 0
        } : 'none',
        resourceRequirementsCount: selectionData.resourceRequirements?.length || 0,
        outgoingConnectorsCount: selectionData.outgoingConnectors?.length || 0,
        statesCount: selectionData.states?.length || 0
      });
      
      // Check if we have embedded document context that needs to be processed
      let hasEmbeddedContext = false;
      if (selectionData.documentContext) {
        logger.debug('Found embedded documentContext in SELECTION_CHANGED', {
          documentId: selectionData.documentContext.documentId,
          pageId: selectionData.documentContext.pageId,
          title: selectionData.documentContext.title,
          isQuodsiModel: selectionData.documentContext.isQuodsiModel
        });
        hasEmbeddedContext = true;
      }
      
      // If we have document information in the selection, update the document context first
      if (selectionData.documentId) {
        logger.debug('Document info found in selection data', {
          documentId: selectionData.documentId,
          hasModel: selectionData.hasModel
        });
      }
      
      if (selectionData.modelItemData) {
        logger.debug('ModelItemData details:', {
          id: selectionData.modelItemData.id,
          name: selectionData.modelItemData.name,
          type: selectionData.modelItemData.type,
          hasMetadata: !!selectionData.modelItemData.metadata,
          metadataType: selectionData.modelItemData.metadata?.type,
          hasQMeta: !!selectionData.modelItemData.q_meta,
          qMetaType: selectionData.modelItemData.q_meta?.type,
        });
      }

      // Process model item data and ensure proper type mapping
      let elements: ExtendedModelItemData[] = [];
      
      if (selectionData.modelItemData) {
        // Handle type information to ensure proper mapping
        const modelItemData = selectionData.modelItemData;
        
        // Check if modelItemData has q_meta data or type data
        if (modelItemData.q_meta && modelItemData.q_meta.type) {
          logger.debug('Using q_meta type:', modelItemData.q_meta.type);
          logger.debug('Found q_meta type:', {
            qMetaType: modelItemData.q_meta.type,
            elementId: modelItemData.id,
            creatingMetadata: !modelItemData.metadata
          });
          modelItemData.metadata = modelItemData.metadata || {
            type: SimulationObjectType.None,
            version: '1.0',
            lastModified: new Date().toISOString(),
            id: modelItemData.id || ''
          };
          modelItemData.metadata.type = modelItemData.q_meta.type as SimulationObjectType;
          logger.debug('Set type from q_meta:', modelItemData.q_meta.type);
        }
        // Check if the modelItemData itself has a type property
        else if (modelItemData.type === 'Resource') {
          logger.debug('Found direct type property: Resource', {
            elementId: modelItemData.id,
            creatingMetadata: !modelItemData.metadata
          });
          modelItemData.metadata = modelItemData.metadata || {
            type: SimulationObjectType.None,
            version: '1.0',
            lastModified: new Date().toISOString(),
            id: modelItemData.id || ''
          };
          modelItemData.metadata.type = SimulationObjectType.Resource;
          logger.debug('Set type from direct property: Resource');
        }
        // Only map diagram to connector, not block to activity
        else if (selectionData.diagramElementType && 
          (!modelItemData.metadata?.type || modelItemData.metadata.type === SimulationObjectType.None)) {
          
          const diagramType = selectionData.diagramElementType.toLowerCase();
          let simulationType = SimulationObjectType.None;
          
          // Only map line to connector, don't default block to activity
          if (diagramType === 'line') {
            simulationType = SimulationObjectType.Connector;
            logger.debug('Mapping line to Connector');
            logger.debug('Mapping line to Connector details:', {
              elementId: modelItemData.id,
              hasMetadata: !!modelItemData.metadata,
              originalMetadataType: modelItemData.metadata?.type
            });
            
            // Update metadata type
            // No need to check if simulationType !== SimulationObjectType.None since we know
            // it's Connector at this point - just update the metadata
            modelItemData.metadata = modelItemData.metadata || {
              type: SimulationObjectType.None,
              version: '1.0',
              lastModified: new Date().toISOString(),
              id: modelItemData.id || ''
            };
            modelItemData.metadata.type = simulationType;
            logger.debug('Set simulation type:', simulationType);
          }
        }
        
        elements = [modelItemData as ExtendedModelItemData];
        logger.debug('Final processed element:', {
          id: modelItemData.id,
          type: modelItemData.type,
          finalMetadataType: modelItemData.metadata?.type,
          finalQMetaType: modelItemData.q_meta?.type,
          isUnconverted: modelItemData.isUnconverted
        });
      } else {
        logger.debug('No modelItemData available in selection');
      }

      // Map to selection update action
      const selectionAction = {
        type: 'SELECTION_UPDATE' as const,
        elements: elements as unknown as ElementShape[],
        totalElements: selectionData.selectionState.selectedIds.length || 0,
        // Include document context if embedded
        ...(hasEmbeddedContext && selectionData.documentContext ? {
          documentContext: {
            documentId: selectionData.documentContext.documentId,
            pageId: selectionData.documentContext.pageId,
            documentTitle: selectionData.documentContext.title,
            isQuodsiModel: selectionData.documentContext.isQuodsiModel,
            metadata: selectionData.documentContext.metadata
          }
        } : {}),
        // Include reference data if present
        ...(selectionData.referenceData ? {
          referenceData: selectionData.referenceData
        } : {}),
        // Include states if present
        ...(selectionData.states ? {
          states: selectionData.states
        } : {}),
        // Include resource requirements if present
        ...(selectionData.resourceRequirements ? {
          resourceRequirements: selectionData.resourceRequirements
        } : {}),
        // Include outgoing connectors if present
        ...(selectionData.outgoingConnectors ? {
          outgoingConnectors: selectionData.outgoingConnectors
        } : {})
      };
      
      logger.log('Returning SELECTION_UPDATE action:', {
        elementCount: selectionAction.elements.length,
        firstElementId: selectionAction.elements[0]?.id,
        firstElementType: (selectionAction.elements[0] as any)?.metadata?.type,
        totalElements: selectionAction.totalElements,
        hasEmbeddedContext: hasEmbeddedContext,
        documentContextIsQuodsiModel: hasEmbeddedContext ? selectionData.documentContext?.isQuodsiModel : undefined,
        hasReferenceData: !!(selectionAction as any).referenceData,
        referenceDataSummary: (selectionAction as any).referenceData ? {
          activities: (selectionAction as any).referenceData.activities?.length || 0,
          resources: (selectionAction as any).referenceData.resources?.length || 0,
          entities: (selectionAction as any).referenceData.entities?.length || 0,
          connectors: (selectionAction as any).referenceData.connectors?.length || 0
        } : 'none',
        statesCount: (selectionAction as any).states?.length || 0,
        resourceRequirementsCount: (selectionAction as any).resourceRequirements?.length || 0,
        outgoingConnectorsCount: (selectionAction as any).outgoingConnectors?.length || 0
      });
      
      return selectionAction;

    default:
      logger.warn('Unhandled message type:', msg.type);
      return null;
  }
}