import { useCallback } from 'react';
import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { useSender } from './useSender';
import { getModalSizePref } from '../../lib/modalSizePref';

/**
 * Focus carried to the Advisor consult modal. Mirrors quodsi_studio's
 * AdvisorFocus, flattened into the field names AdvisorConsultModal puts on
 * the ?view=advisor query string (focusId/focusType/focusName/mode).
 */
export interface AdvisorLaunchFocus {
  /** Shape id of the focused element; '' for the model as a whole. */
  focusId: string;
  focusType: 'Model' | 'Activity' | 'Resource' | 'Generator' | 'Entity' | 'Connector';
  focusName?: string;
  mode: 'definition';
}

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

  /**
   * Send an OPEN_DIAGRAM_MAPPING_MODAL message to open the Diagram Mapping
   * screen (spec 2026-09-15: opens inline, in the extension's own bundle --
   * no longer a hosted Studio embed). The host reads the current page
   * itself, so the payload is just the window-size preference.
   */
  const openDiagramMappingModal = useCallback(() => {
    send(EnvelopeMessageType.OPEN_DIAGRAM_MAPPING_MODAL, { modalSize: getModalSizePref() });
  }, [send]);

  /**
   * Send an OPEN_PATTERN_MODAL message to open the arrival-pattern editor as
   * a real Lucid modal over the whole application. Handled by
   * modelRootHandler.ts on the host side (not simulationRunHandler.ts --
   * see that file's own pointer comment), but the panel-side sender lives
   * here alongside the other OPEN_*_MODAL senders, matching their idiom
   * (getModalSizePref() read at send time).
   */
  const openPatternModal = useCallback((shapeId: string) => {
    send(EnvelopeMessageType.OPEN_PATTERN_MODAL, { shapeId, modalSize: getModalSizePref() });
  }, [send]);

  /**
   * Send an OPEN_SCHEDULE_MODAL message to open the arrival-schedule editor
   * as a real Lucid modal over the whole application. Handled by
   * modelRootHandler.ts on the host side, same as OPEN_PATTERN_MODAL above --
   * see that sender's own comment for the full rationale this mirrors.
   */
  const openScheduleModal = useCallback((shapeId: string) => {
    send(EnvelopeMessageType.OPEN_SCHEDULE_MODAL, { shapeId, modalSize: getModalSizePref() });
  }, [send]);

  /**
   * Send an OPEN_SETTINGS_MODAL message to open the shared Settings screen
   * as a real Lucid modal over the whole application. Handled by
   * modelRootHandler.ts on the host side, same as the other OPEN_*_MODAL
   * senders -- but UNLIKE openPatternModal/openScheduleModal, Settings is
   * global: no shapeId.
   */
  const openSettingsModal = useCallback(() => {
    send(EnvelopeMessageType.OPEN_SETTINGS_MODAL, { modalSize: getModalSizePref() });
  }, [send]);

  /**
   * Send an OPEN_ADVISOR_MODAL message to open the compiled Advisor consult
   * (?view=advisor) as a real Lucid modal. Handled by simulationRunHandler.ts:
   * it needs no server model id, so it opens instantly. The focus
   * fields ride on the query string; modalSize follows the user's preference
   * like every other OPEN_*_MODAL.
   */
  const openAdvisorModal = useCallback((focus: AdvisorLaunchFocus) => {
    send(EnvelopeMessageType.OPEN_ADVISOR_MODAL, { ...focus, modalSize: getModalSizePref() });
  }, [send]);

  return {
    openStudiesModal,
    openDiagramMappingModal,
    openPatternModal,
    openScheduleModal,
    openSettingsModal,
    openAdvisorModal,
  };
}
