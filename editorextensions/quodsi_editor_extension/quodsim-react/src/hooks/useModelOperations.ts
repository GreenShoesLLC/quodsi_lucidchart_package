import { useCallback } from 'react';
import { MessageTypes, SimulationObjectType } from '@quodsi/shared';
import { ExtensionMessaging } from '@quodsi/shared';

/**
 * Custom hook for model operations that works independently from the Model context
 * This version doesn't depend on contexts and can be used before refactoring is complete
 */
export function useModelOperations() {
  const messaging = ExtensionMessaging.getInstance();
  
  // Send a message to select an element
  const selectElement = useCallback((elementId: string) => {
    try {
      console.log("[useModelOperations] Selecting element:", elementId);
      messaging.sendMessage(MessageTypes.GET_ELEMENT_DATA, { elementId });
    } catch (error) {
      console.error("[useModelOperations] Failed to select element:", error);
    }
  }, [messaging]);
  
  // Send a message to update an element
  const updateElement = useCallback((
    elementId: string, 
    data: any, 
    currentElementType?: SimulationObjectType
  ) => {
    try {
      console.log("[useModelOperations] Updating element:", elementId, data);
      
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
          type: currentElementType || SimulationObjectType.None,
          data: {
            ...data,
            id: elementId
          }
        });
      }
    } catch (error) {
      console.error("[useModelOperations] Failed to update element:", error);
    }
  }, [messaging]);
  
  // Send a message to validate the model
  const validateModel = useCallback(() => {
    try {
      console.log("[useModelOperations] Validating model");
      messaging.sendMessage(MessageTypes.VALIDATE_MODEL);
    } catch (error) {
      console.error("[useModelOperations] Failed to validate model:", error);
    }
  }, [messaging]);
  
  // Toggle a tree node's expanded state
  const toggleTreeNode = useCallback((
    nodeId: string, 
    expanded: boolean, 
    documentId?: string
  ) => {
    try {
      console.log("[useModelOperations] Toggling tree node:", nodeId, expanded);
      
      messaging.sendMessage(MessageTypes.TREE_NODE_TOGGLE, {
        nodeId,
        expanded,
        pageId: documentId || ""
      });
    } catch (error) {
      console.error("[useModelOperations] Failed to toggle tree node:", error);
    }
  }, [messaging]);
  
  // Send a message to expand the path to a node
  const expandPath = useCallback((nodeId: string, documentId?: string) => {
    try {
      console.log("[useModelOperations] Expanding path to node:", nodeId);
      messaging.sendMessage(MessageTypes.TREE_NODE_EXPAND_PATH, {
        nodeId,
        pageId: documentId || ""
      });
    } catch (error) {
      console.error("[useModelOperations] Failed to expand path:", error);
    }
  }, [messaging]);
  
  // Send a message to convert an element's type
  const convertElementType = useCallback((
    elementId: string, 
    newType: SimulationObjectType
  ) => {
    try {
      console.log("[useModelOperations] Converting element type:", elementId, newType);
      messaging.sendMessage(MessageTypes.CONVERT_ELEMENT, {
        elementId,
        type: newType
      });
    } catch (error) {
      console.error("[useModelOperations] Failed to convert element type:", error);
    }
  }, [messaging]);
  
  // Send a message to remove the model
  const removeModel = useCallback(() => {
    try {
      console.log("[useModelOperations] Removing model");
      messaging.sendMessage(MessageTypes.REMOVE_MODEL);
    } catch (error) {
      console.error("[useModelOperations] Failed to remove model:", error);
    }
  }, [messaging]);
  
  // Send a message to convert the page
  const convertPage = useCallback(() => {
    try {
      console.log("[useModelOperations] Converting page");
      messaging.sendMessage(MessageTypes.CONVERT_PAGE);
    } catch (error) {
      console.error("[useModelOperations] Failed to convert page:", error);
    }
  }, [messaging]);
  
  // Return all the model operations
  return {
    selectElement,
    updateElement,
    validateModel,
    toggleTreeNode,
    expandPath,
    convertElementType,
    removeModel,
    convertPage
  };
}
