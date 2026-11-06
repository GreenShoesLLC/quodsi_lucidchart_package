// quodsim-react/src/features/editors/LucidConnectorEditor.tsx
//
// Lucid renders Studio's shared ConnectorEditor through the composite
// element-editor accessor, as LucidGeneratorEditor does: connector edits keep
// the selection's reference data and its confirmed ELEMENT_UPDATE, and
// model-level lists (a State, and its lever, made from "+ New state" in a
// condition) go through the model-root queue. Before 2026-11-06 the connector
// read and wrote the reference-data accessor alone, which has no path for
// `states` or `levers`, so creating a State from a connector failed.

import React, { useCallback } from 'react'
import type { EditorReferenceData } from '@quodsi/lucid-shared'
import { ConnectorEditor } from 'quodsi_studio/platforms/shared'
import { useElementEditorAccessor } from '../../adapters/useElementEditorAccessor'
import { useSimulationRunSender } from '../../messaging/senders/simulationRunSender'
import { useModelOpsSender } from '../../messaging/senders/modelOpsSender'

export interface LucidConnectorEditorProps {
  shapeId: string
  referenceData: EditorReferenceData | undefined
}

export const LucidConnectorEditor: React.FC<LucidConnectorEditorProps> = ({ shapeId, referenceData }) => {
  const { accessor, projection } = useElementEditorAccessor(referenceData)
  const { openSettingsModal } = useSimulationRunSender()
  const { selectElement } = useModelOpsSender()
  // Stable (ConnectorEditor memoises its EditorHostContext on it). Above the early return (hook order).
  const onGoToStates = useCallback(() => selectElement('model', { targetTab: 'States' }), [selectElement])

  if (!projection) {
    return <div className="p-3 text-xs text-muted">Loading model…</div>
  }
  return (
    <ConnectorEditor
      shapeId={shapeId}
      accessor={accessor}
      onOpenSettings={openSettingsModal}
      onGoToStates={onGoToStates}
    />
  )
}

export default LucidConnectorEditor
