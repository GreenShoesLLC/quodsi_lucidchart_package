import { 
  MessageTypes,
  MessagePayloads, 
  ValidationMessage,
  RunState,
  SimulationObjectType
} from '@quodsi/shared';
import React from 'react';

// Define dependency types that work with the contexts
export type ContextDependencies = {
  modelDispatch: React.Dispatch<any>;
  simulationDispatch: React.Dispatch<any>;
  uiDispatch: React.Dispatch<any>;
};

export type ContextMessageHandler<T extends MessageTypes> = (
  payload: any,
  deps: ContextDependencies
) => void;

// Message handlers for each message type
export const contextMessageHandlers: Partial<{
  [T in MessageTypes]: ContextMessageHandler<T>;
}> = {
  [MessageTypes.REACT_APP_READY]: (data, { uiDispatch }) => {
    console.log("[MessageHandlers] Processing REACT_APP_READY");
    uiDispatch({ type: 'SET_IS_READY', payload: true });
  },
  
  [MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]: (data, { 
    modelDispatch, 
    uiDispatch 
  }) => {
    console.log("[MessageHandlers] Processing SELECTION_CHANGED_PAGE_NO_MODEL:", data);
    
    // Reset model state
    modelDispatch({ type: 'RESET_MODEL' });
    
    // Update UI state
    uiDispatch({ type: 'SET_SHOW_MODEL_NAME', payload: false });
    uiDispatch({ type: 'SET_SHOW_MODEL_ITEM_NAME', payload: false });
    uiDispatch({ 
      type: 'SET_VISIBLE_SECTIONS', 
      payload: { 
        header: true, 
        validation: false, 
        editor: false, 
        modelTree: false 
      } 
    });
  },
  
  [MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL]: (data, { 
    modelDispatch, 
    uiDispatch,
    simulationDispatch
  }) => {
    console.log("[MessageHandlers] Processing SELECTION_CHANGED_PAGE_WITH_MODEL:", data);
    
    // Create validation state if available
    const validationState = data.validationResult ? {
      summary: {
        errorCount: data.validationResult.errorCount,
        warningCount: data.validationResult.warningCount
      },
      messages: data.validationResult.messages
    } : null;
    
    // Ensure the modelItemData has the correct metadata.type
    const modelItemData = {
      ...data.modelItemData,
      metadata: {
        ...data.modelItemData.metadata,
        type: SimulationObjectType.Model
      }
    };
    
    // Update model state
    modelDispatch({ type: 'SET_CURRENT_ELEMENT', payload: modelItemData });
    modelDispatch({ type: 'SET_MODEL_STRUCTURE', payload: data.modelStructure });
    modelDispatch({ type: 'SET_EXPANDED_NODES', payload: new Set<string>(data.expandedNodes || []) });
    modelDispatch({ type: 'SET_VALIDATION_STATE', payload: validationState });
    modelDispatch({ type: 'SET_MODEL_NAME', payload: modelItemData.name || "Untitled Model" });
    modelDispatch({ type: 'SET_DOCUMENT_ID', payload: data.documentId });
    
    // Update simulation state
    simulationDispatch({ type: 'SET_DOCUMENT_ID', payload: data.documentId });
    
    // Update UI state
    uiDispatch({ type: 'SET_SHOW_MODEL_NAME', payload: true });
    uiDispatch({ type: 'SET_SHOW_MODEL_ITEM_NAME', payload: false });
    uiDispatch({ 
      type: 'SET_VISIBLE_SECTIONS', 
      payload: { 
        header: true, 
        validation: false, 
        editor: true, 
        modelTree: false 
      } 
    });
    uiDispatch({ type: 'SET_PROCESSING', payload: false });
    uiDispatch({ type: 'SET_ERROR', payload: null });
  },
  
  [MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT]: (payload, { 
    modelDispatch, 
    uiDispatch 
  }) => {
    console.log("[MessageHandlers] Processing SELECTION_CHANGED_SIMULATION_OBJECT:", {
      modelItemData: payload.modelItemData,
      data: payload.modelItemData?.data,
    });
    
    // Create currentElement without modifying the type
    const currentElement = {
      ...payload.modelItemData,
      isUnconverted: false
    };
    
    // Update model state
    modelDispatch({ type: 'SET_DIAGRAM_ELEMENT_TYPE', payload: payload.simulationSelection.diagramElementType });
    modelDispatch({ type: 'SET_CURRENT_ELEMENT', payload: currentElement });
    modelDispatch({ type: 'SET_MODEL_STRUCTURE', payload: payload.modelStructure });
    modelDispatch({ type: 'SET_EXPANDED_NODES', payload: new Set<string>(payload.expandedNodes || []) });
    modelDispatch({ 
      type: 'SET_REFERENCE_DATA', 
      payload: payload.referenceData || { entities: [], resources: [] } 
    });
    
    // Update validation state if available
    if (payload.validationResult) {
      modelDispatch({ 
        type: 'SET_VALIDATION_STATE', 
        payload: {
          messages: [...(payload.validationResult.messages || [])],
          summary: {
            errorCount: payload.validationResult.errorCount,
            warningCount: payload.validationResult.warningCount
          },
          isValid: payload.validationResult.isValid,
          errorCount: payload.validationResult.errorCount,
          warningCount: payload.validationResult.warningCount
        }
      });
    } else {
      modelDispatch({ type: 'SET_VALIDATION_STATE', payload: null });
    }
    
    // Set document ID in model state
    modelDispatch({ type: 'SET_DOCUMENT_ID', payload: payload.documentId });
    
    // Update UI state
    uiDispatch({ type: 'SET_SHOW_MODEL_NAME', payload: true });
    uiDispatch({ type: 'SET_SHOW_MODEL_ITEM_NAME', payload: true });
    uiDispatch({ 
      type: 'SET_VISIBLE_SECTIONS', 
      payload: { 
        header: true, 
        validation: false, 
        editor: true, 
        modelTree: false 
      } 
    });
  },
  
  [MessageTypes.SELECTION_CHANGED_MULTIPLE]: (payload, deps) => {
    console.log("[MessageHandlers] Processing SELECTION_CHANGED_MULTIPLE:", payload);
    
    // Check if the page has a model by examining the modelStructure
    if (!payload.modelStructure || !payload.modelStructure.elements || Object.keys(payload.modelStructure.elements).length === 0) {
      // Handle as SELECTION_CHANGED_PAGE_NO_MODEL
      const convertedPayload = {
        pageId: payload.multipleSelection.pageId
      };
      
      // Call the PAGE_NO_MODEL handler with full dependencies
      contextMessageHandlers[MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]?.(
        convertedPayload,
        deps
      );
    } else {
      // Handle as SELECTION_CHANGED_PAGE_WITH_MODEL
      // We know modelStructure exists at this point
      const modelElement = payload.modelStructure.elements.find((e: any) => e.id === "0_0");
      
      if (!modelElement) {
        console.error("Could not find root model element");
        return;
      }
      
      // Create a converted payload matching SELECTION_CHANGED_PAGE_WITH_MODEL format
      const convertedPayload: MessagePayloads[MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL] = {
        selectionState: payload.selectionState,
        modelStructure: payload.modelStructure,
        expandedNodes: payload.expandedNodes,
        validationResult: payload.validationResult,
        pageSelection: {
          pageId: payload.multipleSelection.pageId
        },
        modelItemData: {
          id: "0_0", // Root model ID
          name: modelElement.name || "Untitled Model",
          metadata: {
            type: SimulationObjectType.Model,
            version: "1.0",  // Add appropriate version
            lastModified: new Date().toISOString(), // Current timestamp
            id: "0_0",  // Same as the model ID
            isUnconverted: false
          },
          data: {} // Empty data object for root model
        },
        documentId: payload.documentId
      };
      
      // Call the PAGE_WITH_MODEL handler with full dependencies
      contextMessageHandlers[MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL]?.(
        convertedPayload,
        deps
      );
    }
  },
  
  [MessageTypes.SELECTION_CHANGED_UNCONVERTED]: (payload, { 
    modelDispatch, 
    uiDispatch 
  }) => {
    console.log("[MessageHandlers] Processing SELECTION_CHANGED_UNCONVERTED:", payload);
    
    const currentElement = {
      ...payload.modelItemData,
      isUnconverted: true
    };
    
    // Update model state
    modelDispatch({ type: 'SET_DIAGRAM_ELEMENT_TYPE', payload: payload.unconvertedSelection.diagramElementType });
    modelDispatch({ type: 'SET_CURRENT_ELEMENT', payload: currentElement });
    
    if (payload.modelStructure) {
      modelDispatch({ type: 'SET_MODEL_STRUCTURE', payload: payload.modelStructure });
    }
    
    modelDispatch({ type: 'SET_EXPANDED_NODES', payload: new Set<string>(payload.expandedNodes || []) });
    
    // Update UI state
    uiDispatch({ type: 'SET_SHOW_MODEL_NAME', payload: true });
    uiDispatch({ type: 'SET_SHOW_MODEL_ITEM_NAME', payload: false });
    uiDispatch({ 
      type: 'SET_VISIBLE_SECTIONS', 
      payload: { 
        header: true, 
        validation: false, 
        editor: false, 
        modelTree: false 
      } 
    });
  },
  
  [MessageTypes.VALIDATION_RESULT]: (data, { modelDispatch }) => {
    console.log("[MessageHandlers] Processing VALIDATION_RESULT:", data);
    
    // Update validation state in model context
    modelDispatch({ 
      type: 'SET_VALIDATION_STATE', 
      payload: {
        summary: {
          errorCount: data.messages.filter(
            (m: ValidationMessage) => m.type === "error"
          ).length,
          warningCount: data.messages.filter(
            (m: ValidationMessage) => m.type === "warning"
          ).length,
        },
        messages: data.messages,
      }
    });
  },
  
  [MessageTypes.UPDATE_SUCCESS]: (data, { uiDispatch }) => {
    console.log("[MessageHandlers] Processing UPDATE_SUCCESS:", data);
    uiDispatch({ type: 'SET_PROCESSING', payload: false });
  },
  
  [MessageTypes.ERROR]: (data, { uiDispatch }) => {
    console.error("[MessageHandlers] Received ERROR:", data);
    uiDispatch({ type: 'SET_PROCESSING', payload: false });
    uiDispatch({ type: 'SET_ERROR', payload: data.error });
  },
  
  [MessageTypes.SIMULATION_STARTED]: (payload, { simulationDispatch }) => {
    console.log("[MessageHandlers] SIMULATION_STARTED received:", payload);
    
    // Update simulation state with a default scenario name
    // This matches the behavior in the original messageHandlers.ts
    simulationDispatch({ 
      type: 'START_SIMULATION', 
      payload: 'Base Scenario' 
    });
  },
  
  [MessageTypes.SIMULATION_STATUS_UPDATE]: (payload, { simulationDispatch }) => {
    console.log("[MessageHandlers] SIMULATION_STATUS_UPDATE received:", payload);
    
    // Update simulation status with new page status
    simulationDispatch({ 
      type: 'SET_SIMULATION_STATUS', 
      payload: {
        pageStatus: payload.pageStatus,
        isPollingSimState: true,
        lastChecked: new Date().toISOString(),
        newResultsAvailable: payload.newResultsAvailable || false,
        errorMessage: null
      }
    });
  },
  
  [MessageTypes.SIMULATION_STATUS_ERROR]: (payload, { simulationDispatch }) => {
    simulationDispatch({ 
      type: 'SIMULATION_ERROR',
      payload: payload.errorMessage
    });
  },
  
  [MessageTypes.AUTH_PANEL_INIT]: (data, { uiDispatch }) => {
    console.log("[MessageHandlers] Received AUTH_PANEL_INIT:", data);
    uiDispatch({ type: 'SET_PANEL_TYPE', payload: data.panelType });
  },
  
  [MessageTypes.AUTH_COMPLETED]: (data, { uiDispatch }) => {
    console.log("[MessageHandlers] Received AUTH_COMPLETED:", data);
    // Nothing to do here yet, but we may need to update state later
  },
  
  [MessageTypes.MODEL_PANEL_FOCUS]: (data, { }) => {
    console.log("[MessageHandlers] Model panel received focus");
    // This is handled in the existing QuodsiApp.tsx, so we don't need to do anything here yet
  }
} as const;
