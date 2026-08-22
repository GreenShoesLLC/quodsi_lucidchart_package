import { useCallback, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { EnvelopeBase, EnvelopeMessageType, ISerializedState, ISerializedEntity, ISerializedResourceRequirement } from '@quodsi/lucid-shared';
import { useSender } from './useSender';
import { useMessagingDispatch } from '../MessageContext';

// Generous but bounded — a local ModelManager mutation + re-validate, not a
// network call (same reasoning as useModelRootSource's MODEL_ROOT_UPDATE).
// Module scope: it's a constant, not per-render state, and declaring it
// inside the hook body allocated (and discarded) a fresh binding on every
// render for no reason.
const RESOURCE_REQUIREMENTS_UPDATE_TIMEOUT_MS = 30_000;

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
   * Send a request to update the entities array
   *
   * @param entities Array of serialized entity definitions
   */
  const updateEntities = useCallback((entities: ISerializedEntity[]) => {
    // Use ENTITIES_UPDATE for updating entities
    send(EnvelopeMessageType.ENTITIES_UPDATE, {
      entities
    });
  }, [send]);

  /**
   * Persist the custom resource-requirements list. Unlike the other senders
   * here this is a confirmed round trip: it resolves only when the host
   * replies RESOURCE_REQUIREMENTS_UPDATE_RESULT for this envelope id, so a
   * caller can order a dependent write (e.g. repointing an action at a
   * just-created requirement) after the list is durably stored. Mirrors the
   * mint-your-own-correlation-id idiom in useModelRootSource.transport.send.
   * The handler replies to target 'model-iframe' regardless of source; these
   * editors only ever live in the model panel.
   */
  const updateResourceRequirements = useCallback(
    (resourceRequirements: ISerializedResourceRequirement[]): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        if (!window.parent) {
          reject(new Error('No parent window to send resource requirements to'));
          return;
        }
        const correlationId = uuid();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const handler = (event: MessageEvent) => {
          const msg = event.data;
          if (msg?.id === correlationId && msg?.type === EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE_RESULT) {
            window.removeEventListener('message', handler);
            if (timeoutId !== undefined) clearTimeout(timeoutId);
            const data = (msg.data || {}) as { success?: boolean; errorMessage?: string };
            if (data.success) resolve();
            else reject(new Error(data.errorMessage || 'Resource requirements update failed'));
          }
        };
        window.addEventListener('message', handler);
        timeoutId = setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error('Resource requirements update timed out'));
        }, RESOURCE_REQUIREMENTS_UPDATE_TIMEOUT_MS);
        const envelope: EnvelopeBase = {
          id: correlationId,
          type: EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE,
          source: 'model-iframe',
          target: 'host',
          version: '1.0',
          data: { resourceRequirements },
        };
        window.parent.postMessage(envelope, '*');
      }),
    [],
  );

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
  const selectElement = useCallback((elementId?: string, options?: { targetTab?: 'basic' | 'states' | 'entities' | 'requirements' | 'scenarios' | 'validation' }) => {
    // If a target tab is specified, store it for the Model Editor to consume
    if (options?.targetTab) {
      const { setPendingModelEditorTab } = require('../../utils/pendingNavigation');
      setPendingModelEditorTab(options.targetTab);
    }

    send(EnvelopeMessageType.ELEMENT_SELECT, {
      elementId: elementId || 'model'
    });
  }, [send]);

  /**
   * Send a LOCATE_ELEMENT message so the extension selects and focuses the
   * corresponding shape on the Lucid canvas.
   *
   * @param elementId The Lucid element ID to locate
   */
  const locateElement = useCallback((elementId: string) => {
    send(EnvelopeMessageType.LOCATE_ELEMENT, { elementId });
  }, [send]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    validateModel,
    convertModel,
    removeModel,
    updateElementData,
    convertElement,
    convertPage,
    updateStates,
    updateEntities,
    updateResourceRequirements,
    requestModelJson,
    selectElement,
    locateElement
  }), [
    validateModel,
    convertModel,
    removeModel,
    updateElementData,
    convertElement,
    convertPage,
    updateStates,
    updateEntities,
    updateResourceRequirements,
    requestModelJson,
    selectElement,
    locateElement
  ]);
}
