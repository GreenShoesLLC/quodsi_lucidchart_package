// quodsim-react/src/features/embed/embedWriteEnvelope.ts
//
// Pure translation from the iframe's write relay message to the extension's
// own write envelope. Kept out of EmbeddedStudioFrame so it is unit-testable
// without a DOM. The envelope shapes are exactly what the side panel's own
// senders post (modelOpsSender.updateElement / useModelRootSource /
// statesSender / entitiesSender), so the extension treats an Advisor write
// like any other panel edit.
import { EnvelopeMessageType, type EnvelopeBase } from '@quodsi/lucid-shared';

export type EmbedWriteKind =
  | 'element' | 'modelRoot' | 'states' | 'entities' | 'model'
  | 'createShape' | 'deleteShape' | 'moveShape' | 'createModel';

// The iframe's own write-request promise already rejects itself after 30s
// (see the Studio-side writer); this must exceed that so the iframe always
// gives up first -- a host result arriving after this window is stale and
// simply dropped rather than relayed into a promise nothing is awaiting.
export const WRITE_ID_TTL_MS = 35_000;

/**
 * Per-kind eviction window for the write-id map (see WRITE_ID_TTL_MS above).
 * `createModel` (MODEL_CREATE_PAGE) can build out a whole page of shapes on
 * the host side, which routinely runs past the ordinary 35s budget; give it
 * more room before the frame gives up and drops a result that does arrive.
 */
export function writeTtlMs(kind: EmbedWriteKind): number {
  return kind === 'createModel' ? 65_000 : WRITE_ID_TTL_MS;
}

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
    case 'createShape': {
      const { type, element, near } = payload as { type: string; element: unknown; near?: unknown };
      return { ...base, type: EnvelopeMessageType.SHAPE_CREATE, data: { shapeType: type, element, near } } as EnvelopeBase;
    }
    case 'deleteShape': {
      const { type, elementId } = payload as { type: string; elementId: string };
      return { ...base, type: EnvelopeMessageType.SHAPE_DELETE, data: { shapeType: type, elementId } } as EnvelopeBase;
    }
    case 'moveShape': {
      const { elementId, x, y } = payload as { elementId: string; x: number; y: number };
      return { ...base, type: EnvelopeMessageType.SHAPE_MOVE, data: { elementId, x, y } } as EnvelopeBase;
    }
    case 'createModel': {
      const { document } = payload as { document: unknown };
      return { ...base, type: EnvelopeMessageType.MODEL_CREATE_PAGE, data: { document } } as EnvelopeBase;
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
  EnvelopeMessageType.SHAPE_CREATE_RESULT,
  EnvelopeMessageType.SHAPE_DELETE_RESULT,
  EnvelopeMessageType.SHAPE_MOVE_RESULT,
  EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT,
]);
