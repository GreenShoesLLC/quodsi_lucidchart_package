// quodsim-react/src/features/editors/ResourceBlockEditor.tsx
//
// A Resource BLOCK is a POINTER at a model-level resource, not the record
// itself (Plan 2b). Its shape data carries only `{ id, type: 'Resource',
// resourceId }`; name / capacity / financials / levers all live on the
// model-root `resources` list. This component is the whole Resource-block
// selection surface, and it only ever chooses between two SHARED Studio
// panels:
//   - pointer resolves  -> <ResourceEditor> on that resource (Basic +
//     Financial tabs; Basic renders lever authoring, so nothing was lost
//     when Lucid's own ResourceEditor.tsx was deleted in this task).
//   - pointer absent or DANGLING -> <ResourceLinkPicker>, whose onLink
//     writes ONLY the pointer onto this block via accessor.updateShape
//     (ELEMENT_UPDATE). The create -> durable flush -> link ordering lives
//     inside the picker; do not reimplement it here.
//
// A dangling pointer is deliberately NOT auto-cleared: resolveResourceLinks
// already reports it, ValidationPanel surfaces the warning, and the picker
// below is the fix the user is offered.

import React, { useSyncExternalStore } from 'react'
import { ResourceEditor, ResourceLinkPicker } from 'quodsi_studio/platforms/shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'

interface Props {
  blockId: string
  /** The block's pointer. Absent on a freshly-classified Resource block. */
  resourceId?: string
}

export const ResourceBlockEditor: React.FC<Props> = ({ blockId, resourceId }) => {
  const { accessor } = useModelRootSource()
  // Same subscription idiom every shared panel uses, so this re-renders the
  // moment a MODEL_ROOT_SNAPSHOT lands -- which is what swaps the picker for
  // the editor after a link is written (saveShape re-requests the projection
  // once the host confirms the ELEMENT_UPDATE).
  const snap = useSyncExternalStore(accessor.subscribe, accessor.getSnapshot)
  const resources =
    (snap.modelDefinition as unknown as { resources?: Array<{ id: string }> } | null)?.resources ??
    []
  const linked = resourceId ? resources.find((r) => r.id === resourceId) : undefined

  if (linked) {
    return <ResourceEditor resourceId={linked.id} accessor={accessor} />
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        {resourceId
          ? 'This shape points at a Resource that no longer exists. Link it to an existing Resource or create a new one.'
          : 'This shape is not linked to a Resource yet.'}
      </p>
      <ResourceLinkPicker
        accessor={accessor}
        onLink={(id) => accessor.updateShape(blockId, 'Resource', { resourceId: id })}
        onLinked={() => {}}
      />
    </div>
  )
}

export default ResourceBlockEditor
