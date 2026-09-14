// quodsim-react/src/adapters/useElementEditorAccessor.ts
//
// The composite accessor (elementEditorAccessor.ts) for a mounted shared
// element editor in Lucid (spec 2026-09-14 lucid-shared-generator-editor §1):
// the model-root source, the selection's reference data with the same
// senders ElementEditor gives the shared ConnectorEditor, and a model-root
// refresh whenever the selection changes. Used by LucidGeneratorEditor; the
// Activity swap (sub-project 4) reuses it.

import { useMemo } from 'react'
import type { EditorReferenceData, ModelRootProjection } from '@quodsi/lucid-shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'
import { useModelOpsSender } from '../messaging/senders/modelOpsSender'
import { createElementEditorAccessor } from './elementEditorAccessor'
import { useModelRootRefreshOnSelection } from './useModelRootRefreshOnSelection'
import { useModelRootSource } from './useModelRootSource'
import { useReferenceDataAccessor } from './useReferenceDataAccessor'

export function useElementEditorAccessor(referenceData: EditorReferenceData | undefined): {
  accessor: ModelStateAccessor
  projection: ModelRootProjection | null
} {
  const { accessor: modelRootAccessor, projection, request } = useModelRootSource()
  useModelRootRefreshOnSelection(request)
  const { updateResourceRequirements, updateElement } = useModelOpsSender()
  const referenceAccessor = useReferenceDataAccessor(referenceData, { updateResourceRequirements, updateElement })
  // Both inputs keep their identity for the life of the mount, so this builds
  // once -- and with it the composite's snapshot cache.
  const accessor = useMemo(
    () => createElementEditorAccessor(modelRootAccessor, referenceAccessor),
    [modelRootAccessor, referenceAccessor],
  )
  return { accessor, projection }
}
