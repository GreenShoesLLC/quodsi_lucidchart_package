// editorextensions/quodsi_editor_extension/src/core/messaging/handlers/tourHandler.ts
//
// Lucid onboarding tour (spec 2026-10-16 L2, L3, L7, §5.3-5.4, amendment 3):
//   TOUR_LOAD_EXAMPLE      build the "Airport Security (example)" page with
//                          the Advisor's page builder, then un-convert it so
//                          Convert stays a tour step; L7's replace question is
//                          answered by the panel through `replace`.
//   TOUR_SELECT_SHAPE      select + focus a shape by its Quodsi name, or clear
//                          the selection. No reply.
//   TOUR_SHOW_EXAMPLE_PAGE switch back to the example page (C2).
import {
  EnvelopeBase,
  EnvelopeMessageType,
  getLogger,
} from '@quodsi/lucid-shared';
import type {
  TourLoadExampleData,
  TourLoadExampleResultData,
  TourSelectShapeData,
  TourShowExamplePageResultData,
} from '@quodsi/lucid-shared';
import { DocumentProxy, EditorClient, PageProxy, Viewport } from 'lucid-extension-sdk';
import { router } from '../index';
import { PanelRole } from '../types';
import { ModelManager } from '../../ModelManager';
import { buildModelPage } from '../../ModelPageBuilder';
import { AIRPORT_SECURITY_EXAMPLE, EXAMPLE_PAGE_TITLE } from '../../examples/airportSecurityExample';
import { refreshPageContext } from './pageContextRefresh';

const log = getLogger('TourHandler');

export class TourHandler {
  /**
   * Handle onboarding tour messages.
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.TOUR_LOAD_EXAMPLE:
        TourHandler.handleLoadExample(msg)
          .catch(err => log.error('Error in handleLoadExample:', err));
        return true;

      case EnvelopeMessageType.TOUR_SELECT_SHAPE:
        TourHandler.handleSelectShape(msg);
        return true;

      case EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE:
        TourHandler.handleShowExamplePage(msg);
        return true;

      default:
        return false;
    }
  }

  /** Same routing as ShapeOpsHandler: the Studies modal is 'studio-embed', else the panel. */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
  }

  private static reply(msg: EnvelopeBase, type: EnvelopeMessageType, data: unknown): void {
    const channel = TourHandler.getResponseChannel(msg);
    router.send(channel, {
      id: msg.id,
      type,
      source: 'host',
      target: `${channel}-iframe`,
      version: '1.0',
      data: data as any,
    });
  }

  /** The first page in the document titled EXAMPLE_PAGE_TITLE, if any. */
  private static findExamplePage(client: EditorClient): PageProxy | undefined {
    for (const page of new DocumentProxy(client).pages.values()) {
      if (page.getTitle() === EXAMPLE_PAGE_TITLE) return page;
    }
    return undefined;
  }

  /**
   * TOUR_LOAD_EXAMPLE. An existing example page without `replace` answers
   * `occupied` and touches nothing. Otherwise the new page is built first and
   * the old example page deleted only once that succeeded, so a failed
   * replace leaves the old one in place and the builder's rollback never
   * restores a page that was already deleted. The page is then un-converted
   * (amendment 3): its Model record is parked under q_pending_model for
   * Convert to take back, and the page's own q_data cleared; per-shape data
   * stays. Any failure after the build deletes the new page too, so a
   * `failed` reply never leaves a half-made example behind.
   */
  private static async handleLoadExample(msg: EnvelopeBase): Promise<void> {
    const { replace } = (msg.data ?? {}) as TourLoadExampleData;
    const client = ModelManager.getClient();
    const modelManager = ModelManager.getInstance();
    const viewport = new Viewport(client);
    const reply = (data: TourLoadExampleResultData) =>
      TourHandler.reply(msg, EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT, data);

    const existing = TourHandler.findExamplePage(client);
    if (existing && !replace) {
      reply({ outcome: 'occupied' });
      return;
    }

    const originalPage = viewport.getCurrentPage();
    let built: PageProxy | undefined;
    try {
      ({ page: built } = await buildModelPage(AIRPORT_SECURITY_EXAMPLE, { title: EXAMPLE_PAGE_TITLE }));
      const page = built;

      const storage = modelManager.getStorageAdapter();
      const modelRecord = storage.getElementData<Record<string, unknown>>(page);
      if (!modelRecord) throw new Error('The example page has no model settings to park');
      storage.setPendingModel(page, modelRecord);
      storage.clearElementData(page);

      // resetState, not clear(): clear() would also wipe every shape's
      // q_data on the page the manager holds -- the tuned example itself.
      modelManager.resetState();
      modelManager.setCurrentPage(page);

      existing?.delete();

      refreshPageContext(client, page.id, modelManager, { isQuodsiModel: false });
      reply({ outcome: 'loaded', pageId: page.id });
    } catch (error) {
      log.error('Error loading the example page', error);
      if (built) {
        try {
          if (originalPage) {
            viewport.setCurrentPage(originalPage);
            modelManager.setCurrentPage(originalPage);
          }
          built.delete();
        } catch (rollbackError) {
          log.error('Error removing the example page after a failed load', rollbackError);
        }
      }
      reply({ outcome: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * TOUR_SELECT_SHAPE: `null` clears the selection; a name selects and
   * focuses the first block on the current page whose Quodsi name matches.
   * No match only logs -- the tour's own onMissing handles a target that
   * never appears.
   */
  private static handleSelectShape(msg: EnvelopeBase): void {
    const { name } = (msg.data ?? {}) as TourSelectShapeData;
    const client = ModelManager.getClient();
    const viewport = new Viewport(client);

    if (name === null || name === undefined) {
      viewport.setSelectedItems([]);
      return;
    }

    const page = viewport.getCurrentPage();
    const storage = ModelManager.getInstance().getStorageAdapter();
    if (page) {
      for (const [, block] of page.allBlocks) {
        if (storage.getElementData<{ name?: string }>(block)?.name === name) {
          viewport.setSelectedItems([block]);
          viewport.focusCameraOnItems([block]);
          return;
        }
      }
    }
    log.warn(`TOUR_SELECT_SHAPE: no shape named "${name}" on the current page`);
  }

  /** TOUR_SHOW_EXAMPLE_PAGE: switch to the example page, or say it is missing. */
  private static handleShowExamplePage(msg: EnvelopeBase): void {
    const client = ModelManager.getClient();
    const page = TourHandler.findExamplePage(client);
    let data: TourShowExamplePageResultData = { outcome: 'missing' };
    if (page) {
      new Viewport(client).setCurrentPage(page);
      data = { outcome: 'shown', pageId: page.id };
    }
    TourHandler.reply(msg, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, data);
  }
}
