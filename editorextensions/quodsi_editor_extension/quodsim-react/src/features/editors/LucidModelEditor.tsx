// quodsim-react/src/features/editors/LucidModelEditor.tsx
//
// Lucid's host for Studio's shared ModelEditor (spec 2026-09-13 §1). Every
// Lucid-specific difference arrives here as a prop: entitlements from
// messaging, the extension's validation results, LOCATE_ELEMENT for shape
// issues, host-side reference cleanup, the Lucid work-schedule modal and the
// Lucid Settings modal. ModelEditorForPage renders this once its model-root
// snapshot has loaded; the test seam renders it over the real source.

import React, { useCallback } from 'react'
import { EnvelopeMessageType, type ValidationResult } from '@quodsi/lucid-shared'
import {
  EntitlementsSourceProvider,
  ModelEditor,
  type ModelEditorTab,
  type ModelStateAccessor,
} from 'quodsi_studio/platforms/shared'
import { useMessaging } from '../../messaging/MessageProvider'
import { useSimulationRunSender } from '../../messaging/senders/simulationRunSender'
import { useLucidEntitlementsSource } from '../../adapters/lucidEntitlementsSource'
import { useLucidSourceResolver } from '../../adapters/lucidSourceResolver'
import { toSharedValidationResult } from '../../adapters/toSharedValidationResult'

export interface LucidModelEditorProps {
  accessor: ModelStateAccessor
  activeTab?: ModelEditorTab
  onTabChange?: (tab: ModelEditorTab) => void
  /** The extension's latest validation result; null until the first one arrives. */
  validationState?: ValidationResult | null
}

export function LucidModelEditor({ accessor, activeTab, onTabChange, validationState }: LucidModelEditorProps) {
  const { sendMessage } = useMessaging()
  const { openSettingsModal } = useSimulationRunSender()
  const resolver = useLucidSourceResolver()

  const onEditWorkSchedule = useCallback(
    (scheduleId: string) => sendMessage(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId }),
    [sendMessage],
  )

  return (
    <EntitlementsSourceProvider value={useLucidEntitlementsSource}>
      <ModelEditor
        accessor={accessor}
        activeTab={activeTab}
        onTabChange={onTabChange}
        validationResult={toSharedValidationResult(validationState ?? null)}
        resolver={resolver}
        referenceCleanup="host"
        onEditWorkSchedule={onEditWorkSchedule}
        onOpenSettings={openSettingsModal}
      />
    </EntitlementsSourceProvider>
  )
}
