import type { ISerializedModel } from '../serialization/interfaces/ISerializedModel';

/**
 * Reduced, read-only model catalog relayed into the embedded Studio scenarios
 * editor. MUST stay structurally compatible with quodsi_studio's
 * `RelayedCatalog` (src/platforms/lucid-embed/relayProtocol.ts) — it crosses
 * the postMessage boundary as plain JSON, so the two libs are bridged by shape.
 */
export interface EmbedModelCatalog {
  activities: Array<{
    id: string;
    name: string;
    actions?: Array<{
      id?: string;
      actionType: string;
      duration?: unknown;
      resourceRequirementId?: string | null;
    }>;
  }>;
  resources: Array<{ id: string; name: string }>;
  resourceRequirements: Array<{ id: string; name: string }>;
  generators: Array<{
    id: string;
    name: string;
    generationConfig?: { periodIntervalDuration?: unknown };
  }>;
  connectors: Array<{ id: string; name: string }>;
  entities: Array<{ id: string; name: string }>;
}

type ModelInput = Partial<ISerializedModel>;

function idName(x: { id: string; name: string }): { id: string; name: string } {
  return { id: x.id, name: x.name };
}

export function reduceModelToCatalog(model: ModelInput): EmbedModelCatalog {
  const connectorMap = new Map<string, { id: string; name: string }>();
  for (const a of model.activities ?? []) {
    for (const c of (a as { connectors?: Array<{ id: string; name: string }> }).connectors ?? []) {
      if (c && c.id && !connectorMap.has(c.id)) connectorMap.set(c.id, { id: c.id, name: c.name });
    }
  }

  return {
    activities: (model.activities ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      actions: (a.actions ?? []).map((act) => {
        const out: {
          id?: string;
          actionType: string;
          duration?: unknown;
          resourceRequirementId?: string | null;
        } = {
          id: (act as { id?: string }).id,
          actionType: (act as { actionType: string }).actionType,
        };
        if ('duration' in act && (act as { duration?: unknown }).duration !== undefined) {
          out.duration = (act as { duration?: unknown }).duration;
        }
        if ('resourceRequirementId' in act) {
          out.resourceRequirementId = (act as { resourceRequirementId?: string | null }).resourceRequirementId;
        }
        return out;
      }),
    })),
    resources: (model.resources ?? []).map(idName),
    resourceRequirements: (model.resourceRequirements ?? []).map(idName),
    generators: (model.generators ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      generationConfig: g.generationConfig
        ? { periodIntervalDuration: g.generationConfig.periodIntervalDuration }
        : undefined,
    })),
    connectors: Array.from(connectorMap.values()),
    entities: (model.entities ?? []).map(idName),
  };
}
