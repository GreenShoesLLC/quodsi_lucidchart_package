import { Viewport, DocumentProxy, EditorClient } from 'lucid-extension-sdk';
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
import { SelectionHandler } from './selection';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { canonicalModelName, pushModelDefinitionSnapshot } from '../../sync/scenarioSync';

// Simple ID generator for extension context
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
 * Build the auto-convert mapping from page analysis preview data.
 * Skips entries where proposedType is null (unproposed/no-op) and
 * skips Entity (entities are de-shaped and handled at model level).
 * All remaining proposed types are accepted as-is (no user overrides).
 */
export function buildAutoMappings(
  previewData: { mappings: { elementId: string; proposedType: SimulationObjectType | null }[] },
): Map<string, SimulationObjectType | null> {
  const map = new Map<string, SimulationObjectType | null>();
  for (const m of previewData.mappings) {
    if (m.proposedType == null) continue;                          // skip unproposed
    if (m.proposedType === SimulationObjectType.Entity) continue;  // entities de-shaped
    map.set(m.elementId, m.proposedType);
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

      case EnvelopeMessageType.AUTO_CONVERT_PAGE:
        DiagramMappingRelayHandler.handleAutoConvert(msg).catch((e) =>
          DiagramMappingRelayHandler.logger.error('handleAutoConvert failed', e),
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
   * Handle AUTO_CONVERT_PAGE: analyze the current page, apply proposed types
   * (skipping null and Entity), convert, then run the post-convert refresh so
   * the model panel transitions from "needs initialization" to the model editor
   * and the model row is registered/snapshotted in quodsi_api.
   *
   * Recovered from the deleted ConversionPreviewHandler.handleApplyConversion
   * (git ce884d4). Fire-and-forget: no result message sent to the panel.
   */
  private static async handleAutoConvert(msg: EnvelopeBase): Promise<void> {
    try {
      DiagramMappingRelayHandler.logger.log('AUTO_CONVERT_PAGE received');

      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();

      if (!page) throw new Error('No current page available');

      // Build services the same way handleApply does
      const storageAdapter = new StorageAdapter();
      const factory = new LucidElementFactory(storageAdapter);
      const service = new LucidPageConversionService(modelManager, factory, storageAdapter);
      const pageAnalyzer = new LucidPageAnalyzer();

      // Analyze the page to get proposed mappings
      const previewData = pageAnalyzer.analyzePageForPreview(page, storageAdapter);

      // Build final mappings from proposed types (skip null + Entity)
      const finalMappings = buildAutoMappings(previewData);
      // All auto-proposed — no user overrides
      const userOverrideIds = new Set<string>();

      DiagramMappingRelayHandler.logger.log('AUTO_CONVERT_PAGE: converting', {
        pageId: previewData.pageId,
        mappingCount: finalMappings.size,
      });

      await service.convertPageWithMappings(page, finalMappings, userOverrideIds);

      DiagramMappingRelayHandler.logger.log('AUTO_CONVERT_PAGE: conversion complete, refreshing UI');

      DiagramMappingRelayHandler.postConvertRefresh(client, page.id, modelManager);

    } catch (error) {
      DiagramMappingRelayHandler.logger.error('AUTO_CONVERT_PAGE error:', error);
      // Fire-and-forget — no error message sent to the panel
    }
  }

  /**
   * Post-convert UI + DB refresh, shared by the embed apply (handleApply) and the
   * one-click auto-convert (handleAutoConvert). Recovered from the deleted
   * ConversionPreviewHandler.handleApplyConversion (git ce884d4): broadcasts
   * MODEL_CONTEXT and re-runs SelectionHandler context (sends a fresh
   * SELECTION_CHANGED so the editor panel — including a shape that's still
   * selected behind the modal — reflects the new mapping), registers the model
   * row, and seeds the model-definition snapshot for the Studies catalog.
   * Best-effort and fire-and-forget; never throws into the caller.
   */
  private static postConvertRefresh(
    client: EditorClient,
    pageId: string,
    modelManager: ModelManager,
  ): void {
    const document = new DocumentProxy(client);
    Promise.resolve().then(async () => {
      const documentId = document.id;
      const title = document.getTitle() || 'Untitled Document';

      router.send('model', {
        id: generateId(),
        type: EnvelopeMessageType.MODEL_CONTEXT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: { documentId, title, pageId, isQuodsiModel: true, hasValidModel: true },
      });

      // Document-level context (transitions a freshly-converted page to "is a model").
      SelectionHandler.setDocumentContext(documentId, pageId, title, true);

      // Re-process the current selection so a shape that's still selected behind the
      // modal refreshes its element editor to the new mapping. setDocumentContext
      // alone does NOT re-broadcast the selected element's data — this mirrors
      // elementOpsHandler's post-save SELECTION refresh.
      try {
        const selectedItems = new Viewport(client).getSelectedItems();
        await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);
      } catch (e) {
        DiagramMappingRelayHandler.logger.error('postConvertRefresh: selection refresh failed', e);
      }

      DiagramMappingRelayHandler.logger.log('postConvertRefresh: sent context refresh messages');

      const modelName = await canonicalModelName(modelManager);
      LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_api_data_connector',
        actionName: 'UpsertModel',
        actionData: { documentId, pageId, modelName },
        asynchronous: false,
      }).then(() => {
        DiagramMappingRelayHandler.logger.log('postConvertRefresh: model registered in database');
        void pushModelDefinitionSnapshot(client, { documentId, pageId, modelName }).catch(err => {
          DiagramMappingRelayHandler.logger.error('postConvertRefresh: failed to seed model snapshot:', err);
        });
      }).catch(err => {
        DiagramMappingRelayHandler.logger.error('postConvertRefresh: failed to register model in database:', err);
      });
    }).catch(error => {
      DiagramMappingRelayHandler.logger.error('postConvertRefresh: error in refresh:', error);
    });
  }
}
