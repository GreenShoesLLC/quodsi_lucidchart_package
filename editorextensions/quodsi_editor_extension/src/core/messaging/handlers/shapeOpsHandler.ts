// editorextensions/quodsi_editor_extension/src/core/messaging/handlers/shapeOpsHandler.ts
//
// Advisor drawing half, Task 4: creates, deletes and moves shapes on the
// current page in response to SHAPE_CREATE / SHAPE_DELETE / SHAPE_MOVE.
// These are the "single shape op" half of the Advisor's write path -- the
// compiled Advisor modal (AdvisorConsultModal) sends them with source
// 'studio-embed-iframe' whenever the Advisor proposes adding, removing or
// repositioning one Activity/Generator/Connector on the page.
// MODEL_CREATE_PAGE (a whole Advisor-authored document) delegates to
// ../../ModelPageBuilder.ts -- drawModelInPage on its own empty page, else
// buildModelPage on a new one -- which also holds the record helpers
// SHAPE_CREATE uses.
//
// Mirrors ElementOpsHandler.handleElementUpdate for the
// client/viewport/currentPage/getResponseChannel/reply/selection-refresh
// pattern, and LucidPageConversionService (~lines 700-730) for the
// addBlock -> createPlatformObject -> registerElement creation sequence.
import {
  EnvelopeBase,
  EnvelopeMessageType,
  JsonObject,
  NOT_EMPTY_LINE,
  Resource,
  getLogger,
} from '@quodsi/lucid-shared';
import { router } from '../index';
import { PAGE_GUARD_MISSING_MESSAGE, assertWritePage, otherPageLine } from '../pageGuard';
import { BlockProxy, Viewport, PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import {
  ModelPageBuildError,
  buildModelPage,
  createBlockRecord,
  drawModelInPage,
  createLineRecord,
  newElementFactory,
  pageModelIsEmpty,
  stripGeometry,
} from '../../ModelPageBuilder';
import { PanelRole } from '../types';
import { SelectionHandler } from './selection/SelectionHandler';
import { placeNear, placeAtFlowEnd, ShapeSide } from './shapePlacement';

const log = getLogger('ShapeOpsHandler');

type ShapeType = 'Activity' | 'Generator' | 'Connector';

/**
 * Handler for single-shape create/delete/move operations, driven by the
 * compiled Advisor modal (AdvisorConsultModal, Advisor drawing half).
 */
export class ShapeOpsHandler {
  /**
   * Handle messages related to single-shape operations.
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SHAPE_CREATE:
        ShapeOpsHandler.handleShapeCreate(msg)
          .catch(err => log.error('Error in handleShapeCreate:', err));
        return true;

      case EnvelopeMessageType.SHAPE_DELETE:
        ShapeOpsHandler.handleShapeDelete(msg)
          .catch(err => log.error('Error in handleShapeDelete:', err));
        return true;

      case EnvelopeMessageType.SHAPE_MOVE:
        ShapeOpsHandler.handleShapeMove(msg)
          .catch(err => log.error('Error in handleShapeMove:', err));
        return true;

      case EnvelopeMessageType.MODEL_CREATE_PAGE:
        ShapeOpsHandler.handleModelCreatePage(msg)
          .catch(err => log.error('Error in handleModelCreatePage:', err));
        return true;

      // Not a shape operations message
      default:
        return false;
    }
  }

  /**
   * Determine which channel to send a response to. Today every shape-op
   * message comes from the compiled Advisor modal ('studio-embed-iframe');
   * anything else falls back to 'model' the way ElementOpsHandler's own
   * getResponseChannel does for its unlisted sources.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
  }

  /**
   * Resolves an Advisor-supplied id to a canvas block, trying the id as a
   * literal Lucid block id first and falling back to a Resource pointer
   * lookup.
   *
   * The Advisor names a Resource by its `q_resources` RECORD id (e.g. 'r1'
   * or a uuid) -- the id ModelDefinition tracks it under -- not by the
   * POINTER block's own Lucid-assigned id. Those two only coincide for a
   * legacy-migrated resource (pre storage-format-2, where the block WAS the
   * record). Everywhere else, `page.allBlocks.get(theRecordId)` misses.
   * ModelDefinitionPageBuilder.linkResourceClaimants stamps the winning
   * claimant's block id onto the resource as the transient `shapeId` field
   * (see its doc comment) whenever a canvas block currently claims that
   * resource, so a miss on the direct lookup is retried through
   * `getModelDefinition().resources.get(id).shapeId`. Mirrors
   * DrawioModelManager's cell-miss fallback (~line 677-700 in the drawio
   * repo's src/state/DrawioModelManager.ts).
   */
  private static async resolveBlock(
    page: PageProxy,
    modelManager: ModelManager,
    id: string
  ): Promise<BlockProxy | undefined> {
    const direct = page.allBlocks.get(id);
    if (direct) return direct;

    const def = await modelManager.getModelDefinition();
    const resource = def?.resources.get(id) as (Resource & { shapeId?: string }) | undefined;
    return resource?.shapeId ? page.allBlocks.get(resource.shapeId) : undefined;
  }

  /**
   * Handle SHAPE_CREATE: creates one Activity/Generator (a block) or
   * Connector (a line) on the current page.
   */
  private static async handleShapeCreate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      shapeType: ShapeType;
      element: JsonObject;
      near?: { elementId: string; side: ShapeSide };
      basedOnPageId?: string;
    };

    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Shape create requested', { shapeType: data.shapeType, near: data.near });

    try {
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) {
        throw new Error('Current page not available');
      }
      // Shape ops come only from the compiled Studies/Advisor modal, which
      // stamps the page it was launched for (ClickUp 86e381h8g).
      assertWritePage(msg.source, data.basedOnPageId, page.id);

      // Strip x/y/width/height before this ever reaches a merge -- see
      // stripGeometry's doc comment.
      const advisorElement = stripGeometry((data.element ?? {}) as JsonObject);
      let newId: string;

      if (data.shapeType === 'Connector') {
        const sourceId = (advisorElement as any).sourceId;
        const targetId = (advisorElement as any).targetId;

        const sourceBlock = sourceId ? page.allBlocks.get(sourceId) : undefined;
        if (!sourceBlock) {
          throw new Error(`Connector source not found: ${sourceId}`);
        }
        const targetBlock = targetId ? page.allBlocks.get(targetId) : undefined;
        if (!targetBlock) {
          throw new Error(`Connector target not found: ${targetId}`);
        }

        // C1: registerElement() only updates the in-memory ModelDefinition.
        // createPlatformObject(..., true) already wrote CONVERSION-DEFAULT
        // data to storage (ConnectorLucid.createFromConversion calls
        // storageAdapter.setElementData); without a write-back the merged
        // record (the Advisor's weight/probability/etc.) is discarded the
        // next time validateModel() rebuilds the ModelDefinition FROM
        // STORAGE, and the defaults win. createLineRecord's updateElementData
        // call merges `record` over what's already there -- same call
        // LucidPageConversionService.reserveConvertedName makes to
        // overwrite a conversion default post-hoc.
        const factory = newElementFactory(modelManager);
        const created = await createLineRecord(
          page,
          modelManager,
          factory,
          sourceBlock,
          targetBlock,
          advisorElement
        );
        newId = created.id;
      } else {
        let box;
        if (data.near) {
          const anchor = await ShapeOpsHandler.resolveBlock(page, modelManager, data.near.elementId);
          if (!anchor) {
            throw new Error(`Placement anchor not found: ${data.near.elementId}`);
          }
          box = placeNear(page as any, anchor as any, data.near.side);
        } else {
          box = await placeAtFlowEnd(page as any, modelManager as any);
        }

        // C2: the SDK rejects addBlock for a class that hasn't been loaded
        // in this session. Idempotent -- safe to call on every create, not
        // just the first one after a fresh load.
        await client.loadBlockClasses(['ProcessBlock']);

        // C1 -- see the Connector branch's comment above.
        const factory = newElementFactory(modelManager);
        const created = await createBlockRecord(
          page,
          modelManager,
          factory,
          data.shapeType,
          box,
          advisorElement
        );
        newId = created.id;
      }

      await modelManager.validateModel();

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_CREATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true, id: newId },
      });

      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
    } catch (error) {
      log.error('Error creating shape', error);

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_CREATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return false;
    }
  }

  /**
   * Handle SHAPE_DELETE: deletes one shape. For an Activity/Generator block,
   * also deletes every line attached to it (source or target end) before
   * the block itself, so the model's connector list never briefly points at
   * a deleted block.
   *
   * I2 (fix round 1): modelManager.removeElement(id) is called BEFORE the
   * matching item.delete(), lines first then the block -- not after, and
   * not batched at the end. removeElement resolves the element via
   * page.allBlocks/allLines.get(id) (ModelManager.findElementProxy); once
   * delete() has already removed it from the page that lookup finds
   * nothing, removeElement warns and silently skips its cascades
   * (destination-reference cleanup, orphaned pattern/schedule removal,
   * clearElementData). deletedIds keeps the same lines-first order either
   * way.
   */
  private static async handleShapeDelete(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as { shapeType: ShapeType; elementId: string; basedOnPageId?: string };
    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Shape delete requested', { shapeType: data.shapeType, elementId: data.elementId });

    try {
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) {
        throw new Error('Current page not available');
      }
      // Shape ops come only from the compiled Studies/Advisor modal, which
      // stamps the page it was launched for (ClickUp 86e381h8g).
      assertWritePage(msg.source, data.basedOnPageId, page.id);

      const deletedIds: string[] = [];

      if (data.shapeType === 'Connector') {
        const line = page.allLines.get(data.elementId);
        if (!line) {
          throw new Error(`Element not found: ${data.elementId}`);
        }
        await modelManager.removeElement(line.id);
        line.delete();
        deletedIds.push(line.id);
      } else {
        const block = page.allBlocks.get(data.elementId);
        if (!block) {
          throw new Error(`Element not found: ${data.elementId}`);
        }

        const connectedLines: any[] = [];
        for (const line of page.allLines.values()) {
          const sourceId = line.getEndpoint1().connection?.id;
          const targetId = line.getEndpoint2().connection?.id;
          if (sourceId === block.id || targetId === block.id) {
            connectedLines.push(line);
          }
        }

        for (const line of connectedLines) {
          await modelManager.removeElement(line.id);
          line.delete();
          deletedIds.push(line.id);
        }

        await modelManager.removeElement(block.id);
        block.delete();
        deletedIds.push(block.id);
      }

      await modelManager.validateModel();

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_DELETE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true, deletedIds },
      });

      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
    } catch (error) {
      log.error('Error deleting shape', error);

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_DELETE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return false;
    }
  }

  /**
   * Handle SHAPE_MOVE: repositions a block, keeping its current size.
   */
  private static async handleShapeMove(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as { elementId: string; x: number; y: number; basedOnPageId?: string };
    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Shape move requested', { elementId: data.elementId, x: data.x, y: data.y });

    try {
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) {
        throw new Error('Current page not available');
      }
      // Shape ops come only from the compiled Studies/Advisor modal, which
      // stamps the page it was launched for (ClickUp 86e381h8g).
      assertWritePage(msg.source, data.basedOnPageId, page.id);

      // See resolveBlock's doc comment: the Advisor may name a Resource by
      // its q_resources record id rather than the pointer block's own id.
      const block = await ShapeOpsHandler.resolveBlock(page, modelManager, data.elementId);
      if (!block) {
        throw new Error(`Element not found: ${data.elementId}`);
      }

      const box = block.getBoundingBox();
      block.setBoundingBox({ x: data.x, y: data.y, w: box.w, h: box.h });

      // Moving a block changes its geometry but not any element record, so
      // nothing else marks the model dirty -- without this the next
      // REQUEST_STUDIO_CATALOG would still hand back the pre-move box.
      modelManager.invalidateModelCache();

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_MOVE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true },
      });

      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
    } catch (error) {
      log.error('Error moving shape', error);

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_MOVE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return false;
    }
  }

  /**
   * Handle MODEL_CREATE_PAGE: draws an Advisor-authored document, and replies
   * with the page id and the id map. Where it draws (spec 2026-10-25,
   * advisor tasks in Lucid):
   *  1. `basedOnPageId` is the page showing and its model is empty (no
   *     activities, generators or resources) -> on that page
   *     (drawModelInPage);
   *  2. otherwise, with `requireInPlace` (a project build) -> nowhere: the
   *     reply names the page to go back to (OTHER_PAGE_LINE) or says the
   *     page already has a model (NOT_EMPTY_LINE);
   *  3. otherwise -> a new page titled after the document (buildModelPage,
   *     shared with the onboarding tour's TOUR_LOAD_EXAMPLE).
   * A draw that fails has already been undone by the builder; the reply
   * names the step it failed at.
   */
  private static async handleModelCreatePage(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as { document: JsonObject; basedOnPageId?: string; requireInPlace?: boolean };
    const document = (data.document ?? {}) as Record<string, any>;
    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Model create page requested', { name: document.name, requireInPlace: !!data.requireInPlace });

    const client = ModelManager.getClient();
    const modelManager = ModelManager.getInstance();
    const viewport = new Viewport(client);

    const refuse = (errorMessage: string): boolean => {
      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: false, errorMessage },
      });
      return false;
    };

    try {
      const current = viewport.getCurrentPage();
      const onOwnPage = !!current && !!data.basedOnPageId && data.basedOnPageId === current.id;
      const inPlace = onOwnPage && await pageModelIsEmpty(current!);
      if (!inPlace && data.requireInPlace) {
        if (!data.basedOnPageId) return refuse(PAGE_GUARD_MISSING_MESSAGE);
        return refuse(onOwnPage ? NOT_EMPTY_LINE : otherPageLine(client, data.basedOnPageId));
      }

      const { page, idMap } = inPlace
        ? await drawModelInPage(current!, document)
        : await buildModelPage(document, { title: String(document.name ?? 'Generated model') });

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true, pageId: page.id, idMap },
      });

      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
    } catch (error) {
      log.error('Error creating model page', error);

      const step = error instanceof ModelPageBuildError ? error.step : 'page setup';
      const baseMessage = error instanceof Error ? error.message : String(error);
      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: `create model failed at ${step}: ${baseMessage}`,
        },
      });

      return false;
    }
  }
}
