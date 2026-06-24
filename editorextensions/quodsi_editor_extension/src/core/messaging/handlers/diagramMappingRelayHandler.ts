import { Viewport } from 'lucid-extension-sdk';
import {
  EnvelopeBase,
  EnvelopeMessageType,
  SimulationObjectType,
} from '@quodsi/lucid-shared';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { StorageAdapter } from '../../StorageAdapter';
import { LucidElementFactory } from '../../../services/LucidElementFactory';
import { LucidPageAnalyzer } from '../../../services/conversion/LucidPageAnalyzer';
import { LucidPageConversionService } from '../../../services/conversion/LucidPageConversionService';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

interface MappingChangeLike {
  elementId: string;
  targetType: SimulationObjectType | null;
}

/**
 * Build the elementId→type map the conversion service consumes, dropping any
 * Entity target (entities are de-shaped; mirrors elementOpsHandler which rejects
 * shape→Entity). null (skip/unmap) is preserved.
 */
export function buildFinalMappings(
  changes: MappingChangeLike[],
): Map<string, SimulationObjectType | null> {
  const map = new Map<string, SimulationObjectType | null>();
  for (const c of changes) {
    if (c.targetType === SimulationObjectType.Entity) continue; // Entity guard
    map.set(c.elementId, c.targetType);
  }
  return map;
}

/**
 * Handler for the embedded Studio diagram-mapping relay messages:
 * ANALYZE_PAGE and APPLY_SHAPE_CHANGES.
 *
 * These messages originate in the embedded Studio diagram-mapping screen
 * (2B) and are forwarded here by the extension message router. The handler
 * reuses the existing LucidPageAnalyzer.analyzePageForPreview() and
 * LucidPageConversionService.convertPageWithMappings() (the Phase-1
 * remove-then-add path). The inbound requestId is echoed in every result.
 */
export class DiagramMappingRelayHandler {
  private static logger = ExtensionDebugService.forComponent('DiagramMappingRelayHandler');

  /**
   * Handle messages related to diagram-mapping relay operations.
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.ANALYZE_PAGE:
        DiagramMappingRelayHandler.handleAnalyze(msg).catch((e) =>
          DiagramMappingRelayHandler.logger.error('handleAnalyze failed', e),
        );
        return true;

      case EnvelopeMessageType.APPLY_SHAPE_CHANGES:
        DiagramMappingRelayHandler.handleApply(msg).catch((e) =>
          DiagramMappingRelayHandler.logger.error('handleApply failed', e),
        );
        return true;

      default:
        return false;
    }
  }

  /**
   * Determine which panel channel to send the response to.
   * Mirrors SimulationRunHandler.getResponseChannel: embed-sourced messages
   * go back to the 'studio-embed' channel, everything else to 'model'.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'results-iframe') return 'results';
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
  }

  private static async handleAnalyze(msg: EnvelopeBase): Promise<void> {
    const requestId = (msg.data as { requestId?: number })?.requestId;
    const channel = DiagramMappingRelayHandler.getResponseChannel(msg);
    try {
      DiagramMappingRelayHandler.logger.log('ANALYZE_PAGE received', { requestId });
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) throw new Error('No current page available');

      const storageAdapter = new StorageAdapter();
      const pageAnalyzer = new LucidPageAnalyzer();
      const previewData = pageAnalyzer.analyzePageForPreview(page, storageAdapter);

      DiagramMappingRelayHandler.logger.log('ANALYZE_PAGE complete', {
        requestId,
        pageId: previewData.pageId,
        totalMappings: previewData.mappings.length,
      });

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { requestId, data: previewData },
      });
    } catch (e) {
      DiagramMappingRelayHandler.logger.error('ANALYZE_PAGE error', e);
      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { requestId, error: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  private static async handleApply(msg: EnvelopeBase): Promise<void> {
    const data = msg.data as { requestId?: number; changes?: MappingChangeLike[] };
    const requestId = data?.requestId;
    const channel = DiagramMappingRelayHandler.getResponseChannel(msg);
    try {
      DiagramMappingRelayHandler.logger.log('APPLY_SHAPE_CHANGES received', {
        requestId,
        changeCount: data?.changes?.length ?? 0,
      });

      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) throw new Error('No current page available');

      const storageAdapter = new StorageAdapter();
      const factory = new LucidElementFactory(storageAdapter);
      const service = new LucidPageConversionService(modelManager, factory, storageAdapter);

      const finalMappings = buildFinalMappings(data?.changes ?? []);
      // All relayed changes are explicit user decisions — mark every entry as an override.
      const userOverrideIds = new Set(finalMappings.keys());

      const result = await service.convertPageWithMappings(page, finalMappings, userOverrideIds);

      DiagramMappingRelayHandler.logger.log('APPLY_SHAPE_CHANGES complete', { requestId, result });

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.APPLY_SHAPE_CHANGES_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { requestId, success: true, result },
      });
    } catch (e) {
      DiagramMappingRelayHandler.logger.error('APPLY_SHAPE_CHANGES error', e);
      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.APPLY_SHAPE_CHANGES_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { requestId, success: false, error: e instanceof Error ? e.message : String(e) },
      });
    }
  }
}
