// quodsim-react/src/adapters/lucidEntitlementsSource.ts
//
// Entitlements for the shared Model editor in Lucid's panel (spec 2026-09-13
// §1). Studio reads them with react-query; the panel has no QueryClient and no
// network, and receives them over messaging (camelCase). The shared editor
// reads exactly one field -- BasicSettingsTab's replications-limit warning --
// so that field and `capabilities` (read by useCapability) are mapped.

import { useMemo } from 'react'
import type { Entitlements } from '@quodsi/shared'
import { useMessaging } from '../messaging/MessageProvider'

const NO_CAPABILITIES: string[] = []

export function toSharedEntitlements(
  replicationsPerScenarioLimit: number | null | undefined,
  capabilities: string[] = NO_CAPABILITIES,
): Entitlements | undefined {
  if (replicationsPerScenarioLimit == null && capabilities.length === 0) return undefined
  const out: Partial<Entitlements> = {}
  if (capabilities.length > 0) out.capabilities = capabilities
  if (replicationsPerScenarioLimit != null) {
    out.replications_per_scenario_limit = replicationsPerScenarioLimit
  }
  return out as Entitlements
}

/** EntitlementsSourceProvider's hook for Lucid's panel. */
export function useLucidEntitlementsSource(): { data?: Entitlements } {
  const entitlements = useMessaging()?.entitlements
  const limit = entitlements?.replicationsPerScenarioLimit
  const capabilities = entitlements?.capabilities
  return useMemo(() => ({ data: toSharedEntitlements(limit, capabilities) }), [limit, capabilities])
}
