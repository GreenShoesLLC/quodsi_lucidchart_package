import { useCallback, useMemo } from 'react';
import { EnvelopeMessageType, ISerializedState, ISerializedResourceRequirement, ISerializedTimePattern, ISerializedTimeDistributedConfig } from '@quodsi/shared';
import { useSender } from './useSender';
import { useMessagingDispatch } from '../MessageContext';

/**
 * Custom hook that provides typed functions for sending model operations messages
 *
 * @returns Object containing model operations message sender functions
 */
export function useModelOpsSender() {
  const send = useSender();
  const dispatch = useMessagingDispatch();
  
  /**
   * Send a MODEL_VALIDATE message
   *
   * @param documentId Document ID to validate
   */
  const validateModel = useCallback((documentId: string) => {
    send(EnvelopeMessageType.MODEL_VALIDATE, {
      documentId
    });
  }, [send]);
  
  /**
   * Send a MODEL_CONVERT message
   *
   * @param documentId Document ID to convert
   * @param elementId Optional element ID to convert
   * @param targetType Optional target type to convert to
   */
  const convertModel = useCallback((
    documentId: string,
    elementId?: string,
    targetType?: string
  ) => {
    send(EnvelopeMessageType.MODEL_CONVERT, {
      documentId,
      elementId,
      targetType
    });
  }, [send]);
  
  /**
   * Send a MODEL_REMOVE message
   *
   * @param documentId Document ID to remove model from
   */
  const removeModel = useCallback((documentId: string) => {
    send(EnvelopeMessageType.MODEL_REMOVE, {
      documentId
    });
  }, [send]);
  
  /**
   * Send a RESULTS_PAGE_CREATE message
   *
   * @param scenarioId Scenario ID of the completed simulation
   * @param documentId Document ID to create results page in
   * @param pageTitle Optional page title
   */
  const createResultsPage = useCallback((
    scenarioId: string,
    documentId: string,
    pageTitle?: string
  ) => {
    send(EnvelopeMessageType.RESULTS_PAGE_CREATE, {
      scenarioId,
      documentId,
      pageTitle
    });
  }, [send]);
  
  /**
   * Send an element data update
   *
   * @param elementId Element ID to update
   * @param type Element type
   * @param data Updated element data
   * @param diagramElementType Optional diagram element type ('block' or 'line')
   */
  const updateElementData = useCallback((
    elementId: string,
    type: string,
    data: Record<string, any>,
    diagramElementType?: string
  ) => {
    // Dispatch ELEMENT_SAVE_START action to Redux to track save state
    dispatch({
      type: 'ELEMENT_SAVE_START',
      elementId,
      optimisticData: data, // Store optimistic data for immediate UI update
    });

    // Send the ELEMENT_UPDATE message to the extension
    send(EnvelopeMessageType.ELEMENT_UPDATE, {
      elementId,
      type,
      data: {
        ...data,
        id: elementId  // Ensure ID is included in the data
      },
      diagramElementType
    });
  }, [send, dispatch]);
  
  /**
   * Send a request to convert an element to a new type
   *
   * @param elementId Element ID to convert
   * @param type Target element type
   * @param diagramElementType Optional diagram element type ('block' or 'line')
   */
  const convertElement = useCallback((
    elementId: string,
    type: string,
    diagramElementType?: string
  ) => {
    // Use ELEMENT_CONVERT for converting elements
    send(EnvelopeMessageType.ELEMENT_CONVERT, {
      elementId,
      newType: type,
      diagramElementType
    });
  }, [send]);
  
  /**
   * Send a request to convert the current page to a model
   */
  const convertPage = useCallback(() => {
    // Use MODEL_CONVERT for converting pages
    // No elementId means convert the whole page
    send(EnvelopeMessageType.MODEL_CONVERT, {});
  }, [send]);

  /**
   * Send a request to update the states array
   *
   * @param states Array of serialized state definitions
   */
  const updateStates = useCallback((states: ISerializedState[]) => {
    // Use STATES_UPDATE for updating states
    send(EnvelopeMessageType.STATES_UPDATE, {
      states
    });
  }, [send]);

  /**
   * Send a request to update the resource requirements array
   *
   * @param resourceRequirements Array of serialized resource requirement definitions
   */
  const updateResourceRequirements = useCallback((resourceRequirements: ISerializedResourceRequirement[]) => {
    // Use RESOURCE_REQUIREMENTS_UPDATE for updating resource requirements
    send(EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE, {
      resourceRequirements
    });
  }, [send]);

  /**
   * Send a request to update the time patterns array
   *
   * @param timePatterns Array of serialized time pattern definitions
   */
  const updateTimePatterns = useCallback((timePatterns: ISerializedTimePattern[]) => {
    // Use TIME_PATTERNS_UPDATE for updating time patterns
    send(EnvelopeMessageType.TIME_PATTERNS_UPDATE, {
      timePatterns
    });
  }, [send]);

  /**
   * Send a request to update the time distributed configs array
   *
   * @param timeDistributedConfigs Array of serialized time distributed config definitions
   */
  const updateTimeDistributedConfigs = useCallback((timeDistributedConfigs: ISerializedTimeDistributedConfig[]) => {
    // Use TIME_DISTRIBUTED_CONFIGS_UPDATE for updating time distributed configs
    send(EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE, {
      timeDistributedConfigs
    });
  }, [send]);

  /**
   * Send a request for the serialized model JSON
   *
   * @param documentId Document ID to get model JSON from
   */
  const requestModelJson = useCallback((documentId: string) => {
    // Use MODEL_JSON_REQUEST to get serialized model
    send(EnvelopeMessageType.MODEL_JSON_REQUEST, {
      documentId
    });
  }, [send]);

  /**
   * Send a request to select an element (or clear selection to show Model Editor)
   *
   * @param elementId Optional element ID to select. If 'model' or undefined, clears selection to show Model Editor.
   * @param options Optional configuration including targetTab for Model Editor navigation
   */
  const selectElement = useCallback((elementId?: string, options?: { targetTab?: 'basic' | 'states' | 'requirements' | 'scenarios' | 'validation' }) => {
    // If a target tab is specified, store it for the Model Editor to consume
    if (options?.targetTab) {
      const { setPendingModelEditorTab } = require('../../utils/pendingNavigation');
      setPendingModelEditorTab(options.targetTab);
    }

    send(EnvelopeMessageType.ELEMENT_SELECT, {
      elementId: elementId || 'model'
    });
  }, [send]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    validateModel,
    convertModel,
    removeModel,
    createResultsPage,
    updateElementData,
    convertElement,
    convertPage,
    updateStates,
    updateResourceRequirements,
    updateTimePatterns,
    updateTimeDistributedConfigs,
    requestModelJson,
    selectElement
  }), [
    validateModel,
    convertModel,
    removeModel,
    createResultsPage,
    updateElementData,
    convertElement,
    convertPage,
    updateStates,
    updateResourceRequirements,
    updateTimePatterns,
    updateTimeDistributedConfigs,
    requestModelJson,
    selectElement
  ]);
}
