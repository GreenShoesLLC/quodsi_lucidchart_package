import { EnvelopeMessageType, ISerializedState } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending model operations messages
 * 
 * @returns Object containing model operations message sender functions
 */
export function useModelOpsSender() {
  const send = useSender();
  
  /**
   * Send a MODEL_VALIDATE message
   * 
   * @param documentId Document ID to validate
   */
  const validateModel = (documentId: string) => {
    send(EnvelopeMessageType.MODEL_VALIDATE, {
      documentId
    });
  };
  
  /**
   * Send a MODEL_CONVERT message
   * 
   * @param documentId Document ID to convert
   * @param elementId Optional element ID to convert
   * @param targetType Optional target type to convert to
   */
  const convertModel = (
    documentId: string,
    elementId?: string,
    targetType?: string
  ) => {
    send(EnvelopeMessageType.MODEL_CONVERT, {
      documentId,
      elementId,
      targetType
    });
  };
  
  /**
   * Send a MODEL_REMOVE message
   * 
   * @param documentId Document ID to remove model from
   */
  const removeModel = (documentId: string) => {
    send(EnvelopeMessageType.MODEL_REMOVE, {
      documentId
    });
  };
  
  /**
   * Send a RESULTS_PAGE_CREATE message
   * 
   * @param jobId Job ID of the completed simulation
   * @param documentId Document ID to create results page in
   * @param pageTitle Optional page title
   */
  const createResultsPage = (
    jobId: string,
    documentId: string,
    pageTitle?: string
  ) => {
    send(EnvelopeMessageType.RESULTS_PAGE_CREATE, {
      jobId,
      documentId,
      pageTitle
    });
  };
  
  /**
   * Send an element data update
   * 
   * @param elementId Element ID to update
   * @param type Element type
   * @param data Updated element data
   */
  const updateElementData = (
    elementId: string,
    type: string,
    data: Record<string, any>
  ) => {
    // Use the new ELEMENT_UPDATE message type 
    send(EnvelopeMessageType.ELEMENT_UPDATE, {
      elementId,
      type,
      data: {
        ...data,
        id: elementId  // Ensure ID is included in the data
      }
    });
  };
  
  /**
   * Send a request to convert an element to a new type
   * 
   * @param elementId Element ID to convert
   * @param type Target element type
   */
  const convertElement = (
    elementId: string,
    type: string
  ) => {
    // Use ELEMENT_CONVERT for converting elements
    send(EnvelopeMessageType.ELEMENT_CONVERT, {
      elementId,
      newType: type
    });
  };
  
  /**
   * Send a request to convert the current page to a model
   */
  const convertPage = () => {
    // Use MODEL_CONVERT for converting pages
    // No elementId means convert the whole page
    send(EnvelopeMessageType.MODEL_CONVERT, {});
  };

  /**
   * Send a request to update the states array
   *
   * @param states Array of serialized state definitions
   */
  const updateStates = (states: ISerializedState[]) => {
    // Use STATES_UPDATE for updating states
    send(EnvelopeMessageType.STATES_UPDATE, {
      states
    });
  };

  return {
    validateModel,
    convertModel,
    removeModel,
    createResultsPage,
    updateElementData,
    convertElement,
    convertPage,
    updateStates
  };
}
