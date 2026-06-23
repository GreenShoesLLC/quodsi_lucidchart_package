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
 * Sources of connectors:
 *  1. Activity connectors — serialised as `ISerializedActivity.connectors[]`.
 *  2. Generator exit connectors — serialised as `ISerializedGenerator.exitConnector`
 *     (a bare target-activity id string). The serializer only writes the
 *     *target id*, not a full connector object, so we synthesize a connector
 *     entry here so validation can find the sourceId / targetId pair.
 *
 * Synthetic ids use the `__gen_exit_<generatorId>` prefix, which is long
 * enough to avoid colliding with real UUIDs. If a real connector with the
 * same id appears first, the real one wins and no duplicate is added.
 */
export function buildRelayConnectors(model: ModelInput): RelayCatalogConnector[] {
  const connectorMap = new Map<string, RelayCatalogConnector>();

  // 1. Flatten connectors from all activities (deduplicated by id)
  for (const a of model.activities ?? []) {
    const actWithConnectors = a as {
      connectors?: Array<{
        id?: string;
        name?: string;
        sourceId?: string;
        targetId?: string;
        destinationUniqueId?: string;
        weight?: number;
      }>;
    };
    for (const c of actWithConnectors.connectors ?? []) {
      if (c && c.id && !connectorMap.has(c.id)) {
        connectorMap.set(c.id, {
          id: c.id,
          name: c.name ?? '',
          sourceId: c.sourceId,
          targetId: c.targetId ?? c.destinationUniqueId,
          weight: c.weight,
        });
      }
    }
  }

  // 2. Synthesize connector entries for generator exit connectors.
  //    ISerializedGenerator.exitConnector is the TARGET activity id (a string).
  //    The real connector's id/name/weight were lost in serialization, so we
  //    synthesize a minimal entry that validation only needs for sourceId/targetId.
  for (const g of model.generators ?? []) {
    if (g.exitConnector) {
      const syntheticId = `__gen_exit_${g.id}`;
      if (!connectorMap.has(syntheticId)) {
        connectorMap.set(syntheticId, {
          id: syntheticId,
          name: g.name ? `${g.name} → exit` : 'Generator exit',
          sourceId: g.id,
          targetId: g.exitConnector,
          weight: 1,
        });
      }
    }
  }

  return Array.from(connectorMap.values());
}
