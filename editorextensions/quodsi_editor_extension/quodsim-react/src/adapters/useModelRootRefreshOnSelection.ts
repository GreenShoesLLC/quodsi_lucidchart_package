// quodsim-react/src/adapters/useModelRootRefreshOnSelection.ts
//
// The host pushes a model-root snapshot only after a MODEL_ROOT_UPDATE.
// Canvas edits, the Advisor's Apply, and the compiled Studies/Advisor modal's
// writes push none -- but each ends in a selection re-process, which changes
// selection.lastUpdated. So a changed lastUpdated re-requests a snapshot.
// Previous-value compare, not a skip-once ref: React StrictMode re-runs
// effects, and a skip-once ref fires on the re-run. Shared by
// ModelEditorForPage and useElementEditorAccessor (spec 2026-09-14
// lucid-shared-generator-editor §1).

import { useEffect, useRef } from 'react'
import { useMessaging } from '../messaging/MessageProvider'

export function useModelRootRefreshOnSelection(request: () => void): void {
  const lastUpdated = useMessaging()?.selection?.lastUpdated
  const previousLastUpdated = useRef(lastUpdated)

  useEffect(() => {
    if (previousLastUpdated.current === lastUpdated) return
    previousLastUpdated.current = lastUpdated
    request()
  }, [lastUpdated, request])
}
