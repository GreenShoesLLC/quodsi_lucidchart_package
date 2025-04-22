import React, { createContext, useContext, useReducer, useCallback } from 'react';
import {
  ModelStructure,
  ModelItemData,
  SimulationObjectType,
  DiagramElementType,
  EditorReferenceData,
  ValidationState,
  MessageTypes,
  ExtensionMessaging
} from '@quodsi/shared';

// Define the state structure for model-related data
export interface ModelState {
  modelStructure: ModelStructure | null;
  modelName: string;
  currentElement: ModelItemData | null;
  lastElementUpdate: string | null;
  expandedNodes: Set<string>;
  documentId: string | null;
  diagramElementType?: DiagramElementType;
  referenceData: EditorReferenceData;
  validationState: ValidationState | null;
}

// Initial state
const initialModelState: ModelState = {
  modelStructure: null,
  modelName: "New Model",
  currentElement: null,
  lastElementUpdate: null,
  expandedNodes: new Set<string>(),
  documentId: null,
  referenceData: {
    entities: [],
    resources: [],
  },
  validationState: null
};

// Define the action types for the reducer
type ModelAction =
  | { type: 'SET_MODEL_STRUCTURE'; payload: ModelStructure | null }
  | { type: 'SET_MODEL_NAME'; payload: string }
  | { type: 'SET_CURRENT_ELEMENT'; payload: ModelItemData | null }
  | { type: 'SET_EXPANDED_NODES'; payload: Set<string> }
  | { type: 'TOGGLE_NODE'; payload: { nodeId: string; expanded: boolean } }
  | { type: 'SET_DOCUMENT_ID'; payload: string | null }
  | { type: 'SET_DIAGRAM_ELEMENT_TYPE'; payload: DiagramElementType | undefined }
  | { type: 'SET_REFERENCE_DATA'; payload: EditorReferenceData }
  | { type: 'SET_VALIDATION_STATE'; payload: ValidationState | null }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; data: any } }
  | { type: 'ELEMENT_UPDATED'; payload: string }
  | { type: 'RESET_MODEL' };

// Create the context with an undefined default value
interface ModelContextValue {
  state: ModelState;
  dispatch: React.Dispatch<ModelAction>;
  // Helper functions
  selectElement: (elementId: string) => void;
  updateElement: (elementId: string, data: any) => void;
  validateModel: () => void;
  toggleTreeNode: (nodeId: string, expanded: boolean) => void;
  expandPath: (nodeId: string) => void;
  convertElementType: (elementId: string, newType: SimulationObjectType) => void;
  removeModel: () => void;
  convertPage: () => void;
}

export const ModelContext = createContext<ModelContextValue | undefined>(undefined);

// Reducer function to handle all model-related state updates
function modelReducer(state: ModelState, action: ModelAction): ModelState {
  switch (action.type) {
    case 'SET_MODEL_STRUCTURE':
      return { ...state, modelStructure: action.payload };
      
    case 'SET_MODEL_NAME':
      return { ...state, modelName: action.payload };
      
    case 'SET_CURRENT_ELEMENT':
      return { 
        ...state, 
        currentElement: action.payload,
        lastElementUpdate: action.payload ? new Date().toISOString() : state.lastElementUpdate
      };
      
    case 'SET_EXPANDED_NODES':
      return { ...state, expandedNodes: action.payload };
      
    case 'TOGGLE_NODE': {
      const newExpandedNodes = new Set(state.expandedNodes);
      if (action.payload.expanded) {
        newExpandedNodes.add(action.payload.nodeId);
      } else {
        newExpandedNodes.delete(action.payload.nodeId);
      }
      return { ...state, expandedNodes: newExpandedNodes };
    }
    
    case 'SET_DOCUMENT_ID':
      return { ...state, documentId: action.payload };
      
    case 'SET_DIAGRAM_ELEMENT_TYPE':
      return { ...state, diagramElementType: action.payload };
      
    case 'SET_REFERENCE_DATA':
      return { ...state, referenceData: action.payload };
      
    case 'SET_VALIDATION_STATE':
      return { ...state, validationState: action.payload };
      
    case 'ELEMENT_UPDATED':
      return { ...state, lastElementUpdate: action.payload };
      
    case 'RESET_MODEL':
      return {
        ...initialModelState,
        // Keep documentId when resetting
        documentId: state.documentId
      };
      
    default:
      return state;
  }
}

// Provider component
export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(modelReducer, initialModelState);
  const messaging = ExtensionMessaging.getInstance();
  
  // Helper functions that use the messaging system
  const selectElement = useCallback((elementId: string) => {
    try {
      console.log("[ModelContext] Selecting element:", elementId);
      messaging.sendMessage(MessageTypes.GET_ELEMENT_DATA, { elementId });
    } catch (error) {
      console.error("[ModelContext] Failed to select element:", error);
    }
  }, [messaging]);
  
  const updateElement = useCallback((elementId: string, data: any) => {
    try {
      console.log("[ModelContext] Updating element:", elementId, data);
      
      if (data.type && Object.keys(data).length === 1) {
        // Handle type conversion case
        messaging.sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
          elementId,
          type: data.type,
          data: {} // Empty data for type conversion
        });
      } else {
        // Regular update
        messaging.sendMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
          elementId,
          type: state.currentElement?.metadata?.type || SimulationObjectType.None,
          data: {
            ...data,
            id: elementId
          }
        });
      }
      dispatch({ type: 'ELEMENT_UPDATED', payload: new Date().toISOString() });
    } catch (error) {
      console.error("[ModelContext] Failed to update element:", error);
    }
  }, [messaging, state.currentElement?.metadata?.type]);
  
  const validateModel = useCallback(() => {
    try {
      console.log("[ModelContext] Validating model");
      messaging.sendMessage(MessageTypes.VALIDATE_MODEL);
    } catch (error) {
      console.error("[ModelContext] Failed to validate model:", error);
    }
  }, [messaging]);
  
  const toggleTreeNode = useCallback((nodeId: string, expanded: boolean) => {
    try {
      console.log("[ModelContext] Toggling tree node:", nodeId, expanded);
      dispatch({ 
        type: 'TOGGLE_NODE', 
        payload: { nodeId, expanded } 
      });
      
      messaging.sendMessage(MessageTypes.TREE_NODE_TOGGLE, {
        nodeId,
        expanded,
        pageId: state.documentId || ""
      });
    } catch (error) {
      console.error("[ModelContext] Failed to toggle tree node:", error);
    }
  }, [messaging, state.documentId]);
  
  const expandPath = useCallback((nodeId: string) => {
    try {
      console.log("[ModelContext] Expanding path to node:", nodeId);
      messaging.sendMessage(MessageTypes.TREE_NODE_EXPAND_PATH, {
        nodeId,
        pageId: state.documentId || ""
      });
    } catch (error) {
      console.error("[ModelContext] Failed to expand path:", error);
    }
  }, [messaging, state.documentId]);
  
  const convertElementType = useCallback((elementId: string, newType: SimulationObjectType) => {
    try {
      console.log("[ModelContext] Converting element type:", elementId, newType);
      messaging.sendMessage(MessageTypes.CONVERT_ELEMENT, {
        elementId,
        type: newType
      });
    } catch (error) {
      console.error("[ModelContext] Failed to convert element type:", error);
    }
  }, [messaging]);
  
  const removeModel = useCallback(() => {
    try {
      console.log("[ModelContext] Removing model");
      messaging.sendMessage(MessageTypes.REMOVE_MODEL);
    } catch (error) {
      console.error("[ModelContext] Failed to remove model:", error);
    }
  }, [messaging]);
  
  const convertPage = useCallback(() => {
    try {
      console.log("[ModelContext] Converting page");
      messaging.sendMessage(MessageTypes.CONVERT_PAGE);
    } catch (error) {
      console.error("[ModelContext] Failed to convert page:", error);
    }
  }, [messaging]);
  
  // Combine state, dispatch and helper functions
  const contextValue: ModelContextValue = {
    state,
    dispatch,
    selectElement,
    updateElement,
    validateModel,
    toggleTreeNode,
    expandPath,
    convertElementType,
    removeModel,
    convertPage
  };
  
  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
};

// Custom hook to use the model context
export const useModel = () => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};
