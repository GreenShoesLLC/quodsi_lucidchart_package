import { Viewport, EditorClient } from 'lucid-extension-sdk';
import {
  EnvelopeBase,
  EnvelopeMessageType,
  SimulationObjectType,
} from '@quodsi/lucid-shared';
import type {
  AutoConvertPageResultData,
  PageConversionCounts,
  PageCountsData,
} from '@quodsi/lucid-shared';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { StorageAdapter } from '../../StorageAdapter';
import { LucidElementFactory } from '../../../services/LucidElementFactory';
import { LucidPageAnalyzer } from '../../../services/conversion/LucidPageAnalyzer';
import { LucidPageConversionService } from '../../../services/conversion/LucidPageConversionService';
import { getLogger } from '@quodsi/lucid-shared';
import { refreshPageContext } from './pageContextRefresh';
import { otherPageLine } from '../pageGuard';

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

type AutoMappingRow = { currentType?: SimulationObjectType | null; proposedType: SimulationObjectType | null };

/**
 * The type an automatic conversion gives one analyzed element: its stored
 * q_data type when it has one (the user's earlier decision, kept by L6 --
 * a pasted Activity with nothing flowing into it must not become the
 * Generator its topology suggests), else the analyzer's proposal. null, or
 * Entity (entities are de-shaped and handled at model level), leaves the
 * element out of the conversion.
 */
function autoType(m: AutoMappingRow): SimulationObjectType | null {
  const type = m.currentType ?? m.proposedType;
  return type === SimulationObjectType.Entity ? null : type;
}

/**
 * Build the auto-convert mapping from page analysis preview data: each
 * element at its autoType, skipping the ones it leaves out. No user
 * overrides are involved.
 */
export function buildAutoMappings(
  previewData: { mappings: ({ elementId: string } & AutoMappingRow)[] },
): Map<string, SimulationObjectType | null> {
  const map = new Map<string, SimulationObjectType | null>();
  for (const m of previewData.mappings) {
    const type = autoType(m);
    if (type != null) map.set(m.elementId, type);
  }
  return map;
}

/**
 * The blank-slate card's result counts for an automatic conversion (spec
 * 2026-09-15 section 1): the conversion service's element counts,
 * `entities: 0` (LucidChart never creates entities from shapes), and
 * `skipped` = analyzed page items the automatic mapping left unclassified --
 * the ones autoType leaves out, exactly what buildAutoMappings drops.
 */
export function toPageConversionCounts(
  elementCount: { activities: number; generators: number; resources: number; connectors: number },
  previewData: { mappings: AutoMappingRow[] },
): PageConversionCounts {
  const skipped = previewData.mappings.filter((m) => autoType(m) == null).length;
  return {
    activities: elementCount.activities,
    generators: elementCount.generators,
    resources: elementCount.resources,
    entities: 0,
    connectors: elementCount.connectors,
    skipped,
  };
}

/**
 * Handler for the Diagram Mapping relay messages: ANALYZE_PAGE and
 * APPLY_SHAPE_CHANGES.
 *
 * These messages now originate in the INLINE Diagram Mapping modal (spec
 * 2026-09-15, "opens inline") — not the Studio diagram-mapping screen (2B,
 * formerly embedded via an iframe modal since removed) this class
 * originally served, which this handler no longer relays for (see
 * DiagramMappingModal.ts's header for that history). They are forwarded here
 * by the extension message router the same way regardless of source. The
 * handler reuses the existing
 * LucidPageAnalyzer.analyzePageForPreview() and
 * LucidPageConversionService.convertPageWithMappings() (the Phase-1
 * remove-then-add path). The inbound requestId is echoed in every result.
 */
export class DiagramMappingRelayHandler {
  private static logger = getLogger('DiagramMappingRelayHandler');

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

      case EnvelopeMessageType.AUTO_CONVERT_PAGE:
        DiagramMappingRelayHandler.handleAutoConvert(msg).catch((e) =>
          DiagramMappingRelayHandler.logger.error('handleAutoConvert failed', e),
        );
        return true;

      case EnvelopeMessageType.PAGE_COUNTS_REQUEST:
        DiagramMappingRelayHandler.handlePageCounts(msg);
        return true;

      default:
        return false;
    }
  }

  /**
   * Determine which panel channel to send the response to. The inline
   * Diagram Mapping modal's own ANALYZE_PAGE/APPLY_SHAPE_CHANGES come back
   * on the 'diagram-mapping' channel; PAGE_COUNTS_REQUEST/AUTO_CONVERT_PAGE
   * from the model panel's blank-slate card come back on 'model', and the
   * Advisor modal's AUTO_CONVERT_PAGE on 'studio-embed'. Mirrors
   * SimulationRunHandler.getResponseChannel.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'results-iframe') return 'results';
    if (msg.source === 'diagram-mapping-iframe') return 'diagram-mapping';
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
  }

  private static async handleAnalyze(msg: EnvelopeBase): Promise<void> {
    const requestId = (msg.data as { requestId?: number })?.requestId;
    const channel = DiagramMappingRelayHandler.getResponseChannel(msg);
    try {
      DiagramMappingRelayHandler.logger.debug('ANALYZE_PAGE received', { requestId });
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) throw new Error('No current page available');

      const storageAdapter = new StorageAdapter();
      const pageAnalyzer = new LucidPageAnalyzer();
      const previewData = pageAnalyzer.analyzePageForPreview(page, storageAdapter);

      DiagramMappingRelayHandler.logger.debug('ANALYZE_PAGE complete', {
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
    const data = msg.data as { requestId?: number; changes?: MappingChangeLike[]; resetExisting?: boolean };
    const requestId = data?.requestId;
    const channel = DiagramMappingRelayHandler.getResponseChannel(msg);
    try {
      DiagramMappingRelayHandler.logger.debug('APPLY_SHAPE_CHANGES received', {
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

      const result = await service.convertPageWithMappings(page, finalMappings, userOverrideIds, {
        resetExisting: data?.resetExisting === true,
      });

      DiagramMappingRelayHandler.logger.debug('APPLY_SHAPE_CHANGES complete', { requestId, result });

      // Refresh the main editor: re-broadcast the selection/context so a shape
      // that's still selected behind the modal reflects its new mapping (without
      // this, the panel stays stale until the user reselects), and keep the DB
      // model snapshot current.
      DiagramMappingRelayHandler.postConvertRefresh(client, page.id, modelManager);

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

  /**
   * Handle PAGE_COUNTS_REQUEST: reply with the current page's block and line
   * counts, which the model panel's blank-slate card shows before conversion.
   * With no page open it replies zeros, so the card never waits on a reply
   * that never comes.
   */
  private static handlePageCounts(msg: EnvelopeBase): void {
    const channel = DiagramMappingRelayHandler.getResponseChannel(msg);
    let data: PageCountsData = { pageId: '', shapeCount: 0, lineCount: 0 };
    try {
      const page = new Viewport(ModelManager.getClient()).getCurrentPage();
      if (page) {
        data = { pageId: page.id, shapeCount: page.allBlocks.size, lineCount: page.allLines.size };
      }
    } catch (error) {
      DiagramMappingRelayHandler.logger.error('PAGE_COUNTS_REQUEST error:', error);
    }
    router.send(channel, {
      id: msg.id,
      type: EnvelopeMessageType.PAGE_COUNTS,
      source: 'host',
      target: `${channel}-iframe`,
      version: '1.0',
      data,
    });
  }

  /**
   * Handle AUTO_CONVERT_PAGE: analyze the current page, apply each element's
   * stored-else-proposed type (buildAutoMappings), convert, reply AUTO_CONVERT_PAGE_RESULT with
   * the counts, then run the post-convert refresh so the model panel moves
   * from the blank-slate card to the model editor and the model row is
   * registered/snapshotted in quodsi_api. A failure replies with the error
   * instead, so the card can show it with Retry (spec 2026-09-15 section 1).
   *
   * `onlyIfUnconverted` (the Advisor modal's Start a project, 2026-10-26): a page that
   * is already a model replies success with zero counts and is left alone, and a page
   * other than the one showing is refused, naming it -- the conversion works on the page
   * showing, not the one the modal was opened for.
   *
   * Recovered from the deleted ConversionPreviewHandler.handleApplyConversion
   * (git ce884d4).
   */
  private static async handleAutoConvert(msg: EnvelopeBase): Promise<void> {
    try {
      DiagramMappingRelayHandler.logger.debug('AUTO_CONVERT_PAGE received');

      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();

      if (!page) throw new Error('No current page available');

      const req = (msg.data ?? {}) as { pageId?: string; onlyIfUnconverted?: boolean };
      if (req.onlyIfUnconverted) {
        if (req.pageId && page.id !== req.pageId) throw new Error(otherPageLine(client, req.pageId));
        if (modelManager.isQuodsiModel(page)) {
          DiagramMappingRelayHandler.sendAutoConvertResult(msg, {
            success: true,
            result: { activities: 0, generators: 0, resources: 0, entities: 0, connectors: 0, skipped: 0 },
          });
          return;
        }
      }

      // Build services the same way handleApply does
      const storageAdapter = new StorageAdapter();
      const factory = new LucidElementFactory(storageAdapter);
      const service = new LucidPageConversionService(modelManager, factory, storageAdapter);
      const pageAnalyzer = new LucidPageAnalyzer();

      // Analyze the page to get proposed mappings
      const previewData = pageAnalyzer.analyzePageForPreview(page, storageAdapter);

      // Stored type wins, else the proposal (skip null + Entity)
      const finalMappings = buildAutoMappings(previewData);
      // All auto-proposed — no user overrides
      const userOverrideIds = new Set<string>();

      DiagramMappingRelayHandler.logger.debug('AUTO_CONVERT_PAGE: converting', {
        pageId: previewData.pageId,
        mappingCount: finalMappings.size,
      });

      const result = await service.convertPageWithMappings(page, finalMappings, userOverrideIds);

      DiagramMappingRelayHandler.logger.debug('AUTO_CONVERT_PAGE: conversion complete, refreshing UI');

      DiagramMappingRelayHandler.sendAutoConvertResult(msg, {
        success: true,
        result: toPageConversionCounts(result.elementCount, previewData),
      });

      DiagramMappingRelayHandler.postConvertRefresh(client, page.id, modelManager);

    } catch (error) {
      DiagramMappingRelayHandler.logger.error('AUTO_CONVERT_PAGE error:', error);
      DiagramMappingRelayHandler.sendAutoConvertResult(msg, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Reply to AUTO_CONVERT_PAGE on the requesting panel's channel, with its envelope id. */
  private static sendAutoConvertResult(msg: EnvelopeBase, data: AutoConvertPageResultData): void {
    const channel = DiagramMappingRelayHandler.getResponseChannel(msg);
    router.send(channel, {
      id: msg.id,
      type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT,
      source: 'host',
      target: `${channel}-iframe`,
      version: '1.0',
      data,
    });
  }

  /**
   * Post-convert UI + DB refresh, shared by the inline Diagram Mapping
   * modal's apply (handleApply) and the one-click auto-convert
   * (handleAutoConvert): refreshPageContext (pageContextRefresh.ts, also used
   * by TourHandler) for a page that is now a model.
   * Best-effort and fire-and-forget; never throws into the caller.
   */
  private static postConvertRefresh(
    client: EditorClient,
    pageId: string,
    modelManager: ModelManager,
  ): void {
    void refreshPageContext(client, pageId, modelManager, { isQuodsiModel: true });
  }
}
