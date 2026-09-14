// quodsim-react/src/features/editors/LucidGeneratorEditor.tsx
//
// Lucid renders Studio's shared GeneratorEditor (spec 2026-09-14
// lucid-shared-generator-editor): every tab reads and writes through the
// composite element-editor accessor (model-root snapshot, full connectors from
// the selection's reference data), and the host hooks open Lucid's own modals
// and navigation. Nothing is editable before the first model-root snapshot.

import React from 'react'
import type { EditorReferenceData } from '@quodsi/lucid-shared'
import { GeneratorEditor } from 'quodsi_studio/platforms/shared'
import { useElementEditorAccessor } from '../../adapters/useElementEditorAccessor'
import { useSimulationRunSender } from '../../messaging/senders/simulationRunSender'
import { useModelOpsSender } from '../../messaging/senders/modelOpsSender'

export interface LucidGeneratorEditorProps {
  shapeId: string
  referenceData: EditorReferenceData | undefined
}

export const LucidGeneratorEditor: React.FC<LucidGeneratorEditorProps> = ({ shapeId, referenceData }) => {
  const { accessor, projection } = useElementEditorAccessor(referenceData)
  const { openPatternModal, openScheduleModal, openSettingsModal } = useSimulationRunSender()
  const { selectElement } = useModelOpsSender()

  if (!projection) {
    return <div className="p-3 text-xs text-muted">Loading model…</div>
  }
  return (
    <GeneratorEditor
      shapeId={shapeId}
      accessor={accessor}
      onOpenPatternModal={() => openPatternModal(shapeId)}
      onOpenScheduleModal={() => openScheduleModal(shapeId)}
      onOpenSettings={openSettingsModal}
      onGoToStates={() => selectElement('model', { targetTab: 'States' })}
    />
  )
}

export default LucidGeneratorEditor
