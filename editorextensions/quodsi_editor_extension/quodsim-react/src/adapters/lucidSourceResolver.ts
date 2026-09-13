// quodsim-react/src/adapters/lucidSourceResolver.ts
//
// "Go to source" for the shared Model editor's Validation tab in Lucid (spec
// 2026-09-13 §1). The shared editor routes model-level issues to Basic and
// entity issues to Entities itself; everything else with an element id is a
// canvas shape the extension selects on LOCATE_ELEMENT -- the same rule
// embedded Studio's resolver uses.

import { useMemo } from 'react'
import { isEntityIssue, isModelLevelIssue, type SourceResolver, type ValidationIssue } from '@quodsi/shared'
import { useModelOpsSender } from '../messaging/senders/modelOpsSender'

export function createLucidSourceResolver(locateElement: (elementId: string) => void): SourceResolver {
  return {
    canLocate: (issue: ValidationIssue) => !isModelLevelIssue(issue) && !isEntityIssue(issue) && !!issue.elementId,
    locate: (issue: ValidationIssue) => {
      if (issue.elementId) locateElement(issue.elementId)
    },
    canFix: () => false,
    applyFix: () => {},
  }
}

export function useLucidSourceResolver(): SourceResolver {
  const { locateElement } = useModelOpsSender()
  return useMemo(() => createLucidSourceResolver(locateElement), [locateElement])
}
