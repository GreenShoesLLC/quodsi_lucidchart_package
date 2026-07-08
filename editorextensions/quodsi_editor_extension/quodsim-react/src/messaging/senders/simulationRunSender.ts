import { useCallback } from 'react';
import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { useSender } from './useSender';
import { getModalSizePref } from '../../lib/modalSizePref';

/**
 * Custom hook that provides typed functions for sending simulation run-related messages
 *
 * @returns Object containing simulation run operations message sender functions
 */
export function useSimulationRunSender() {
  const send = useSender();

  /** Send an OPEN_STUDIES_MODAL message to open the embedded-Studio Studies surface. */
  const openStudiesModal = useCallback((documentId: string, pageId: string) => {
    send(EnvelopeMessageType.OPEN_STUDIES_MODAL, { documentId, pageId, modalSize: getModalSizePref() });
  }, [send]);

  /** Send an OPEN_DIAGRAM_MAPPING_MODAL message to open the embedded Studio Diagram Mapping surface. */
  const openDiagramMappingModal = useCallback((documentId: string, pageId: string) => {
    send(EnvelopeMessageType.OPEN_DIAGRAM_MAPPING_MODAL, { documentId, pageId, modalSize: getModalSizePref() });
  }, [send]);

  /**
   * Send an OPEN_STATUS_MODAL message to open the embedded-Studio public /status
   * page. Status is model-agnostic, so no documentId/pageId is needed.
   */
  const openStatusModal = useCallback(() => {
    send(EnvelopeMessageType.OPEN_STATUS_MODAL, { modalSize: getModalSizePref() });
  }, [send]);

  /**
   * Send an AUTO_CONVERT_PAGE message to trigger a one-click auto-convert.
   * The extension analyzes the page, applies proposed types (skipping null +
   * Entity), converts, and refreshes the model panel — no modal opened.
   */
  const autoConvertPage = useCallback((documentId: string, pageId: string) => {
    send(EnvelopeMessageType.AUTO_CONVERT_PAGE, { documentId, pageId });
  }, [send]);

  return {
    openStudiesModal,
    openDiagramMappingModal,
    openStatusModal,
    autoConvertPage,
  };
}
