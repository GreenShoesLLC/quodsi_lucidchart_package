// quodsim-react/src/adapters/lucidEntitlementsSource.ts
//
// Entitlements for the shared Model editor in Lucid's panel (spec 2026-09-13
// §1). Studio reads them with react-query; the panel has no QueryClient and no
// network, and receives them over messaging (camelCase). The shared editor
// reads exactly one field -- BasicSettingsTab's replications-limit warning --
// so only that field is mapped.

import { useMemo } from 'react'
import type { Entitlements } from '@quodsi/shared'
import { useMessaging } from '../messaging/MessageProvider'

export function toSharedEntitlements(
  replicationsPerScenarioLimit: number | null | undefined,
): Entitlements | undefined {
  if (replicationsPerScenarioLimit == null) return undefined
  return { replications_per_scenario_limit: replicationsPerScenarioLimit } as Entitlements
}

/** EntitlementsSourceProvider's hook for Lucid's panel. */
export function useLucidEntitlementsSource(): { data?: Entitlements } {
  const limit = useMessaging()?.entitlements?.replicationsPerScenarioLimit
  return useMemo(() => ({ data: toSharedEntitlements(limit) }), [limit])
}
