import type { ISerializedModel } from '../serialization/interfaces/ISerializedModel';

/**
 * A single connector entry in the relay catalog.
 * Structurally compatible with the `connectors` entries in
 * `quodsi_studio`'s RelayedCatalog.
 */
export interface RelayCatalogConnector {
  id: string;
  name: string;
  sourceId?: string;
  targetId?: string;
  weight?: number;
}

type ModelInput = Partial<ISerializedModel>;

/**
 * Build the deduplicated connector list for the relay catalog sent to the
 * embedded Studio iframe.
 *
 * As of the 2026.08.20 flat-connector canonicalization, the serializer emits
 * one top-level `connectors[]` array covering every connector regardless of
 * source (activity or generator) — no more per-activity embedding or
 * generator `exitConnector` synthesis needed; this just maps + dedupes it.
 */
export function buildRelayConnectors(model: ModelInput): RelayCatalogConnector[] {
  const connectorMap = new Map<string, RelayCatalogConnector>();

  for (const c of model.connectors ?? []) {
    const cc = c as { id?: string; name?: string; sourceId?: string; targetId?: string; weight?: number };
    if (cc && cc.id && !connectorMap.has(cc.id)) {
      connectorMap.set(cc.id, {
        id: cc.id,
        name: cc.name ?? '',
        sourceId: cc.sourceId,
        targetId: cc.targetId,
        weight: cc.weight,
      });
    }
  }

  return Array.from(connectorMap.values());
}
