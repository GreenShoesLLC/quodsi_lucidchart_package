// quodsim-react/src/adapters/lucidSourceResolver.ts
//
// "Go to source" for the shared Model editor's Validation tab in Lucid (spec
// 2026-09-13 §1). The rule lives in one place, quodsi_studio's
// createLocateResolver (platforms/lucid-embed/embeddedSourceResolver.ts),
// shared with the compiled Studies/Advisor modals. The panel only supplies the
// locate step: the extension selects the shape on LOCATE_ELEMENT. Unlike the
// modals, the panel has nothing to close.

import { useMemo } from 'react'
import type { SourceResolver } from '@quodsi/shared'
import { createLocateResolver } from 'quodsi_studio/platforms/lucid-host'
import { useModelOpsSender } from '../messaging/senders/modelOpsSender'

export function useLucidSourceResolver(): SourceResolver {
  const { locateElement } = useModelOpsSender()
  return useMemo(() => createLocateResolver(locateElement), [locateElement])
}
