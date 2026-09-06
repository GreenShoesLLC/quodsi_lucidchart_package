// editorextensions/quodsi_editor_extension/src/core/messaging/handlers/shapeOpsHandler.ts
//
// Advisor drawing half, Task 4: creates, deletes and moves shapes on the
// current page in response to SHAPE_CREATE / SHAPE_DELETE / SHAPE_MOVE.
// These are the "single shape op" half of the Advisor's write path -- the
// embedded Studio iframe (Task 3's EmbeddedStudioFrame) sends them with
// source 'studio-embed-iframe' whenever the Advisor proposes adding,
// removing or repositioning one Activity/Generator/Connector on the page.
// MODEL_CREATE_PAGE (bulk page creation from an Advisor-authored document)
// is Task 5 -- the switch below has a slot ready for it but does not handle
// it yet, so it falls through to `default: return false` like any other
// unhandled message.
//
// Mirrors ElementOpsHandler.handleElementUpdate for the
// client/viewport/currentPage/getResponseChannel/reply/selection-refresh
// pattern, and LucidPageConversionService (~lines 700-730) for the
// addBlock -> createPlatformObject -> registerElement creation sequence.
import {
  EnvelopeBase,
  EnvelopeMessageType,
  JsonObject,
  SimulationObjectType,
  getLogger,
} from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport, DocumentProxy, PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { LucidElementFactory } from '../../../services/LucidElementFactory';
import { PanelRole } from '../types';
import { SelectionHandler } from './selection/SelectionHandler';
import { placeNear, placeAtFlowEnd, ShapeSide } from './shapePlacement';

const log = getLogger('ShapeOpsHandler');

type ShapeType = 'Activity' | 'Generator' | 'Connector';

/**
 * Advisor-authored geometry that must never survive into the merged record.
 * The placement engine (placeNear / placeAtFlowEnd) is the sole author of
 * where a newly created shape lands -- a stray x/y/width/height carried on
 * the Advisor's `element` payload (e.g. copied from wherever the Advisor
 * last saw the shape) would otherwise silently overwrite the placed box
 * once the merged record is written back to storage.
 */
const GEOMETRY_KEYS = ['x', 'y', 'width', 'height'] as const;

function stripGeometry(element: JsonObject): JsonObject {
  const stripped: any = { ...element };
  for (const key of GEOMETRY_KEYS) {
    delete stripped[key];
  }
  return stripped;
}

/**
 * MODEL_CREATE_PAGE's document root keys that make up the page-level "Model"
 * write -- the same run-settings fields ElementOpsHandler.handleElementUpdate
 * writes for `type === 'Model'`. Only keys the document actually carries are
 * copied through.
 */
const RUN_SETTINGS_KEYS = [
  'name',
  'description',
  'replications',
  'seed',
  'timeUnit',
  'timeMode',
  'runTime',
  'warmupTime',
  'startDateTime',
] as const;

/**
 * MODEL_CREATE_PAGE's document root keys that make up the model-ROOT patch,
 * i.e. exactly the keys ModelManager.updateModelRoot recognises. Passing an
 * unrecognised key would make updateModelRoot throw, so this list must never
 * drift from that method's own `knownKeys`.
 */
const MODEL_ROOT_KEYS = [
  'resources',
  'resourceRequirements',
  'arrivalPatterns',
  'arrivalSchedules',
  'workSchedules',
] as const;

/**
 * Handler for single-shape create/delete/move operations, driven by the
 * embedded Studio iframe (Advisor drawing half).
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
   * message comes from the embedded Studio iframe ('studio-embed-iframe');
   * anything else falls back to 'model' the way ElementOpsHandler's own
   * getResponseChannel does for its unlisted sources.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
  }

  /**
   * Fix round 1 (minor): reuse the manager's own StorageAdapter instead of
   * constructing a fresh one, so the factory's conversion-default write and
   * this handler's own updateElementData overwrite (see handleShapeCreate)
   * go through the same adapter the rest of ModelManager uses.
   */
  private static newElementFactory(modelManager: ModelManager): LucidElementFactory {
    return new LucidElementFactory(modelManager.getStorageAdapter());
  }

  private static shapeSimType(shapeType: ShapeType): SimulationObjectType {
    switch (shapeType) {
      case 'Activity':
        return SimulationObjectType.Activity;
      case 'Generator':
        return SimulationObjectType.Generator;
      case 'Connector':
        return SimulationObjectType.Connector;
    }
  }

  /**
   * Creates one Activity/Generator block at `box`, converts it via the
   * factory, merges the Advisor's element data over the conversion default,
   * and writes the merged record both to the in-memory ModelDefinition
   * (registerElement) and to storage (updateElementData) -- see the C1/C2
   * comments on handleShapeCreate's original single-block path, which this
   * factors out of. Callers are responsible for `client.loadBlockClasses`
   * (handleShapeCreate does it per call; the page-creation path does it once
   * for the whole page).
   */
  private static async createBlockRecord(
    page: any,
    modelManager: ModelManager,
    factory: LucidElementFactory,
    shapeType: 'Activity' | 'Generator',
    box: { x: number; y: number; w: number; h: number },
    advisorElement: JsonObject
  ): Promise<{ id: string; block: any; record: JsonObject }> {
    const newBlock = page.addBlock({ className: 'ProcessBlock', boundingBox: box });

    const name = (advisorElement as any).name ?? `New ${shapeType}`;
    newBlock.textAreas.set('Text', name);

    const platformObject = factory.createPlatformObject(newBlock, ShapeOpsHandler.shapeSimType(shapeType), true);
    const record = {
      ...platformObject.getSimulationObject(),
      ...advisorElement,
      id: newBlock.id,
    };

    await modelManager.registerElement(record as any, newBlock);
    modelManager.getStorageAdapter().updateElementData(newBlock as any, record as any);

    return { id: newBlock.id, block: newBlock, record };
  }

  /**
   * Creates a Resource block at `box` -- a POINTER at a model-level record,
   * not a shape-owned domain record (storage format 2; see ResourceLucid's
   * doc comment and LucidPageConversionService ~700-725, which this mirrors).
   * Unlike createBlockRecord, there is deliberately NO storage write-back
   * here: the resource's actual data (name/capacity/etc.) already lives in
   * the page's q_resources list, written by the page-level
   * `updateModelRoot({ resources })` call before any block exists. Merging a
   * domain record onto the block's q_data here would overwrite the pointer
   * and re-classify the block as storage-format-1 on the next open.
   */
  private static async createResourceBlockRecord(
    page: any,
    modelManager: ModelManager,
    factory: LucidElementFactory,
    box: { x: number; y: number; w: number; h: number },
    advisorElement: JsonObject
  ): Promise<{ id: string; block: any; record: JsonObject }> {
    const newBlock = page.addBlock({ className: 'ProcessBlock', boundingBox: box });

    const name = (advisorElement as any).name ?? 'New Resource';
    newBlock.textAreas.set('Text', name);

    const platformObject = factory.createPlatformObject(newBlock, SimulationObjectType.Resource, true);
    const record = {
      ...platformObject.getSimulationObject(),
      ...advisorElement,
      id: newBlock.id,
    };

    await modelManager.registerElement(record as any, newBlock);

    return { id: newBlock.id, block: newBlock, record };
  }

  /**
   * Creates a Connector line between two already-created blocks, converts
   * it via the factory, merges the Advisor's element data (with sourceId/
   * targetId forced to the Lucid-assigned block ids), and writes the merged
   * record both in-memory and to storage. Factored out of handleShapeCreate
   * for reuse by the page-creation path -- see createBlockRecord's comment.
   */
  private static async createLineRecord(
    page: any,
    modelManager: ModelManager,
    factory: LucidElementFactory,
    sourceBlock: any,
    targetBlock: any,
    advisorElement: JsonObject
  ): Promise<{ id: string; line: any; record: JsonObject }> {
    const newLine = page.addLine({
      endpoint1: { connection: sourceBlock, linkX: 1, linkY: 0.5 },
      endpoint2: { connection: targetBlock, linkX: 0, linkY: 0.5 },
    });

    const platformObject = factory.createPlatformObject(newLine, SimulationObjectType.Connector, true);
    const record = {
      ...platformObject.getSimulationObject(),
      ...advisorElement,
      id: newLine.id,
      sourceId: sourceBlock.id,
      targetId: targetBlock.id,
    };

    await modelManager.registerElement(record as any, newLine);
    modelManager.getStorageAdapter().updateElementData(newLine as any, record as any);

    return { id: newLine.id, line: newLine, record };
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
        const factory = ShapeOpsHandler.newElementFactory(modelManager);
        const created = await ShapeOpsHandler.createLineRecord(
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
          const anchor = page.allBlocks.get(data.near.elementId);
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
        const factory = ShapeOpsHandler.newElementFactory(modelManager);
        const created = await ShapeOpsHandler.createBlockRecord(
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
    const data = msg.data as { shapeType: ShapeType; elementId: string };
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
    const data = msg.data as { elementId: string; x: number; y: number };
    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Shape move requested', { elementId: data.elementId, x: data.x, y: data.y });

    try {
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) {
        throw new Error('Current page not available');
      }

      const block = page.allBlocks.get(data.elementId);
      if (!block) {
        throw new Error(`Element not found: ${data.elementId}`);
      }

      const box = block.getBoundingBox();
      block.setBoundingBox({ x: data.x, y: data.y, w: box.w, h: box.h });

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_MOVE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true },
      });

      const modelManager = ModelManager.getInstance();
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
   * Handle MODEL_CREATE_PAGE: builds a whole new page from an
   * Advisor-authored document -- positions and all. Creates the page,
   * switches both the viewport and the ModelManager to it, writes the
   * page-level model (run settings, then the model-root lists, then states
   * and entities), creates every block (generators, activities, resources)
   * and then every line (connectors, endpoints resolved through the
   * resulting Advisor-id -> Lucid-id map), validates, and replies with the
   * page id and the id map.
   *
   * Any failure once the page exists rolls it back: the viewport and the
   * ModelManager are pointed back at whatever page was current before this
   * ran, and the new page is deleted -- in that order, so neither host is
   * ever left holding a reference to a page that's about to disappear.
   */
  private static async handleModelCreatePage(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as { document: JsonObject };
    const document = (data.document ?? {}) as Record<string, any>;
    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Model create page requested', { name: document.name });

    const client = ModelManager.getClient();
    const modelManager = ModelManager.getInstance();
    const viewport = new Viewport(client);
    const originalPage = viewport.getCurrentPage();

    let page: any;
    let currentStep = 'page setup';

    try {
      const doc = new DocumentProxy(client);
      page = doc.addPage({ title: String(document.name ?? 'Generated model') });

      viewport.setCurrentPage(page);
      modelManager.setCurrentPage(page);

      // Page-level Model write -- same call handleElementUpdate makes for
      // type Model (ElementOpsHandler.handleElementUpdate treats the page
      // itself as the element).
      currentStep = 'page settings';
      const runSettings: JsonObject = {};
      for (const key of RUN_SETTINGS_KEYS) {
        if (key in document) {
          (runSettings as any)[key] = document[key];
        }
      }
      await modelManager.saveElementData(
        page,
        { ...runSettings, id: page.id },
        SimulationObjectType.Model,
        page
      );

      // Model-root lists (resources, resourceRequirements, arrivalPatterns,
      // arrivalSchedules, workSchedules) -- only the keys the document
      // actually carries; updateModelRoot throws on anything it doesn't
      // recognise.
      currentStep = 'model root';
      const rootPatch: Record<string, unknown> = {};
      for (const key of MODEL_ROOT_KEYS) {
        if (key in document) {
          rootPatch[key] = document[key];
        }
      }
      await modelManager.updateModelRoot(rootPatch, page);

      if ('states' in document) {
        currentStep = 'states';
        await modelManager.updateStates(document.states, page);
      }
      if ('entities' in document) {
        currentStep = 'entities';
        await modelManager.updateEntities(document.entities, page);
      }

      const factory = ShapeOpsHandler.newElementFactory(modelManager);
      const idMap: Record<string, string> = {};

      // Loaded ONCE for the whole page -- not per block, unlike the single-
      // shape SHAPE_CREATE path where every call is its own request.
      await client.loadBlockClasses(['ProcessBlock']);

      const blockBox = (record: Record<string, any>) => ({
        x: Number(record.x) || 0,
        y: Number(record.y) || 0,
        w: 80,
        h: 80,
      });

      const generators = (document.generators ?? []) as Array<Record<string, any>>;
      for (const record of generators) {
        currentStep = String(record.id);
        const created = await ShapeOpsHandler.createBlockRecord(
          page,
          modelManager,
          factory,
          'Generator',
          blockBox(record),
          stripGeometry(record)
        );
        idMap[String(record.id)] = created.id;
      }

      const activities = (document.activities ?? []) as Array<Record<string, any>>;
      for (const record of activities) {
        currentStep = String(record.id);
        const created = await ShapeOpsHandler.createBlockRecord(
          page,
          modelManager,
          factory,
          'Activity',
          blockBox(record),
          stripGeometry(record)
        );
        idMap[String(record.id)] = created.id;
      }

      const resources = (document.resources ?? []) as Array<Record<string, any>>;
      for (const record of resources) {
        currentStep = String(record.id);
        const created = await ShapeOpsHandler.createResourceBlockRecord(
          page,
          modelManager,
          factory,
          blockBox(record),
          stripGeometry(record)
        );
        idMap[String(record.id)] = created.id;
      }

      const connectors = (document.connectors ?? []) as Array<Record<string, any>>;
      for (const record of connectors) {
        currentStep = String(record.id);
        const sourceAdvisorId = record.sourceId;
        const targetAdvisorId = record.targetId;

        const sourceLucidId = sourceAdvisorId !== undefined ? idMap[String(sourceAdvisorId)] : undefined;
        if (!sourceLucidId) {
          throw new Error(`Connector source not found: ${sourceAdvisorId}`);
        }
        const targetLucidId = targetAdvisorId !== undefined ? idMap[String(targetAdvisorId)] : undefined;
        if (!targetLucidId) {
          throw new Error(`Connector target not found: ${targetAdvisorId}`);
        }

        const sourceBlock = page.allBlocks.get(sourceLucidId);
        const targetBlock = page.allBlocks.get(targetLucidId);

        const created = await ShapeOpsHandler.createLineRecord(
          page,
          modelManager,
          factory,
          sourceBlock,
          targetBlock,
          stripGeometry(record)
        );
        idMap[String(record.id)] = created.id;
      }

      await modelManager.validateModel();

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

      if (page) {
        try {
          if (originalPage) {
            viewport.setCurrentPage(originalPage);
            modelManager.setCurrentPage(originalPage);
          }
          page.delete();
        } catch (rollbackError) {
          log.error('Error rolling back created page', rollbackError);
        }
      }

      const baseMessage = error instanceof Error ? error.message : String(error);
      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: `create model failed at ${currentStep}: ${baseMessage}`,
        },
      });

      return false;
    }
  }
}
