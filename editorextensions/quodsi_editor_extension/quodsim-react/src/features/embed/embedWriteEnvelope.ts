// quodsim-react/src/features/embed/embedWriteEnvelope.ts
//
// Pure translation from the iframe's write relay message to the extension's
// own write envelope. Kept out of EmbeddedStudioFrame so it is unit-testable
// without a DOM. The envelope shapes are exactly what the side panel's own
// senders post (modelOpsSender.updateElement / useModelRootSource /
// statesSender / entitiesSender), so the extension treats an Advisor write
// like any other panel edit.
import { EnvelopeMessageType, type EnvelopeBase } from '@quodsi/lucid-shared';

export type EmbedWriteKind = 'element' | 'modelRoot' | 'states' | 'entities' | 'model';

// The iframe's own write-request promise already rejects itself after 30s
// (see the Studio-side writer); this must exceed that so the iframe always
// gives up first -- a host result arriving after this window is stale and
// simply dropped rather than relayed into a promise nothing is awaiting.
export const WRITE_ID_TTL_MS = 35_000;

export function buildWriteEnvelope(kind: EmbedWriteKind, payload: any, id: string): EnvelopeBase | null {
  const base = { id, source: 'studio-embed-iframe' as const, target: 'host' as const, version: '1.0' };
  switch (kind) {
    case 'element': {
      const { elementId, type, patch } = payload as { elementId: string; type: string; patch: Record<string, unknown> };
      return {
        ...base,
        type: EnvelopeMessageType.ELEMENT_UPDATE,
        data: {
          elementId,
          type,
          data: { ...patch, id: elementId },
          // findElementById checks allLines first for 'line'; a Connector's
          // shape is a line, everything else the Advisor patches is a block.
          diagramElementType: type === 'Connector' ? 'line' : 'block',
        },
      } as EnvelopeBase;
    }
    case 'modelRoot':
      return { ...base, type: EnvelopeMessageType.MODEL_ROOT_UPDATE, data: { patch: (payload as { patch: unknown }).patch } } as EnvelopeBase;
    case 'states':
      return { ...base, type: EnvelopeMessageType.STATES_UPDATE, data: { states: (payload as { states: unknown }).states } } as EnvelopeBase;
    case 'entities':
      return { ...base, type: EnvelopeMessageType.ENTITIES_UPDATE, data: { entities: (payload as { entities: unknown }).entities } } as EnvelopeBase;
    case 'model': {
      // Run settings live on the Lucid page. ElementOpsHandler treats
      // type 'Model' as "the current page" and StorageAdapter merges, so a
      // partial patch is safe; no diagramElementType (it is not a shape).
      const { elementId, patch } = payload as { elementId: string; patch: Record<string, unknown> };
      return {
        ...base,
        type: EnvelopeMessageType.ELEMENT_UPDATE,
        data: { elementId, type: 'Model', data: { ...patch, id: elementId } },
      } as EnvelopeBase;
    }
    default:
      return null;
  }
}

/** The result envelope types the frame relays back into the iframe. */
export const WRITE_RESULT_TYPES: ReadonlySet<string> = new Set([
  EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
  EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
  EnvelopeMessageType.STATES_UPDATE_RESULT,
  EnvelopeMessageType.ENTITIES_UPDATE_RESULT,
]);
