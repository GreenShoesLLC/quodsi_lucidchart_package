// editorextensions/quodsi_editor_extension/src/core/ModelPageBuilder.ts
//
// Builds a whole Lucid page from a model document -- positions and all: add
// the page, switch the viewport and ModelManager to it, write the page-level
// model (run settings, model root, states, entities), create every block
// (generators, activities, resources) and then every line (connectors,
// endpoints resolved through the document-id -> Lucid-id map), validate.
//
// Extracted from ShapeOpsHandler.handleModelCreatePage (Advisor drawing half,
// Task 5) so the Advisor's MODEL_CREATE_PAGE and the onboarding tour's
// TOUR_LOAD_EXAMPLE build pages the same way (spec 2026-10-16 §5.3). The
// single-shape record helpers SHAPE_CREATE also uses live here too.
//
// drawModelInPage draws a document on the page showing instead (an Advisor
// project build on its own empty page, spec 2026-10-25): it merges into the
// page's model rather than replacing it, and undoes itself on failure.
import {
  JsonObject,
  SimulationObjectType,
  getLogger,
} from '@quodsi/lucid-shared';
import { Viewport, DocumentProxy, PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from './ModelManager';
import { LucidElementFactory } from '../services/LucidElementFactory';

const log = getLogger('ModelPageBuilder');

/**
 * Advisor-authored geometry that must never survive into the merged record.
 * The placement engine (placeNear / placeAtFlowEnd) is the sole author of
 * where a newly created shape lands -- a stray x/y/width/height carried on
 * the Advisor's `element` payload (e.g. copied from wherever the Advisor
 * last saw the shape) would otherwise silently overwrite the placed box
 * once the merged record is written back to storage.
 */
const GEOMETRY_KEYS = ['x', 'y', 'width', 'height'] as const;

export function stripGeometry(element: JsonObject): JsonObject {
  const stripped: any = { ...element };
  for (const key of GEOMETRY_KEYS) {
    delete stripped[key];
  }
  return stripped;
}

/**
 * The document root keys that make up the page-level "Model" write -- the
 * same run-settings fields ElementOpsHandler.handleElementUpdate writes for
 * `type === 'Model'`. Only keys the document actually carries are copied
 * through.
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
 * The document root keys that make up the model-ROOT patch, i.e. exactly the
 * keys ModelManager.updateModelRoot recognises. Passing an unrecognised key
 * would make updateModelRoot throw, so this list must never drift from that
 * method's own `knownKeys`.
 */
const MODEL_ROOT_KEYS = [
  'resources',
  'resourceRequirements',
  'arrivalPatterns',
  'arrivalSchedules',
  'workSchedules',
] as const;

/**
 * A page build that failed once the page existed. `step` names where (a
 * section, or the document id of the record being created); the page has
 * already been rolled back when this is thrown.
 */
export class ModelPageBuildError extends Error {
  constructor(public readonly step: string, message: string) {
    super(message);
    this.name = 'ModelPageBuildError';
  }
}

/**
 * Reuse the manager's own StorageAdapter instead of constructing a fresh
 * one, so the factory's conversion-default write and the record helpers'
 * own updateElementData overwrite go through the same adapter the rest of
 * ModelManager uses.
 */
export function newElementFactory(modelManager: ModelManager): LucidElementFactory {
  return new LucidElementFactory(modelManager.getStorageAdapter());
}

function shapeSimType(shapeType: 'Activity' | 'Generator'): SimulationObjectType {
  return shapeType === 'Activity' ? SimulationObjectType.Activity : SimulationObjectType.Generator;
}

/**
 * Creates one Activity/Generator block at `box`, converts it via the
 * factory, merges the element data over the conversion default, and writes
 * the merged record both to the in-memory ModelDefinition (registerElement)
 * and to storage (updateElementData) -- see the C1/C2 comments on
 * ShapeOpsHandler.handleShapeCreate. Callers are responsible for
 * `client.loadBlockClasses` (handleShapeCreate does it per call; the page
 * builder does it once for the whole page).
 */
export async function createBlockRecord(
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

  const platformObject = factory.createPlatformObject(newBlock, shapeSimType(shapeType), true);
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
 * doc comment). The resource record (with `advisorElement.id`) was already
 * written into the page's q_resources list by the page-level
 * `updateModelRoot({ resources })` call before any block exists.
 *
 * This must NOT go through `factory.createPlatformObject(..., Resource,
 * true)` -- ResourceLucid.createFromConversion looks for an EXISTING
 * q_resources record whose id equals the just-created BLOCK's id, never
 * finds one, and mints a SECOND orphaned record. Instead this writes the
 * pointer directly, `{ id: block.id, resourceId: advisorElement.id }`, via
 * the public `modelManager.setElementData` (the same shape the
 * ResourceBlockEditor link path stores). No `registerElement` call either --
 * its Resource case is a documented no-op.
 */
export async function createResourceBlockRecord(
  page: any,
  modelManager: ModelManager,
  box: { x: number; y: number; w: number; h: number },
  advisorElement: JsonObject
): Promise<{ id: string; block: any }> {
  const newBlock = page.addBlock({ className: 'ProcessBlock', boundingBox: box });

  const name = (advisorElement as any).name ?? 'New Resource';
  newBlock.textAreas.set('Text', name);

  modelManager.setElementData(
    newBlock as any,
    { id: newBlock.id, resourceId: String((advisorElement as any).id) },
    SimulationObjectType.Resource
  );

  return { id: newBlock.id, block: newBlock };
}

/**
 * Creates a Connector line between two already-created blocks, converts it
 * via the factory, merges the element data (with sourceId/targetId forced to
 * the Lucid-assigned block ids), and writes the merged record both in-memory
 * and to storage -- see createBlockRecord's comment.
 */
export async function createLineRecord(
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
 * Builds a new page titled `opts.title` from `document`, leaving the
 * viewport and ModelManager on it. Returns the page and the document-id ->
 * Lucid-id map.
 *
 * Any failure once the page exists rolls it back -- the viewport and the
 * ModelManager are pointed back at whatever page was current before this
 * ran, and the new page is deleted, in that order, so neither host is ever
 * left holding a reference to a page that's about to disappear -- and then
 * throws a ModelPageBuildError naming the step.
 */
export async function buildModelPage(
  document: Record<string, any>,
  opts: { title: string; textSize?: number }
): Promise<{ page: PageProxy; idMap: Record<string, string> }> {
  const client = ModelManager.getClient();
  const modelManager = ModelManager.getInstance();
  const viewport = new Viewport(client);
  const originalPage = viewport.getCurrentPage();

  let page: any;
  let currentStep = 'page setup';

  try {
    const doc = new DocumentProxy(client);
    page = doc.addPage({ title: opts.title });

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

    // Model-root lists -- only the keys the document actually carries;
    // updateModelRoot throws on anything it doesn't recognise.
    currentStep = 'model root';
    const rootPatch: Record<string, unknown> = {};
    for (const key of MODEL_ROOT_KEYS) {
      if (key in document) {
        // The document's resource records carry layout x/y (needed below to
        // place their blocks), but q_resources is a model-level list with no
        // geometry.
        rootPatch[key] = key === 'resources'
          ? (document.resources as Array<Record<string, any>>).map(stripGeometry)
          : document[key];
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

    const { idMap } = await drawRecords(page, document, {
      textSize: opts.textSize,
      onStep: (step) => { currentStep = step; },
    });

    await modelManager.validateModel();

    return { page, idMap };
  } catch (error) {
    log.error('Error building model page', error);

    if (page) {
      try {
        if (originalPage) {
          viewport.setCurrentPage(originalPage);
          modelManager.setCurrentPage(originalPage);
        } else {
          // There was no page open before this ran (e.g. a brand-new
          // document), so there is nothing to restore. ModelManager is left
          // pointing at the page we're about to delete -- surfaced loudly.
          log.warn('Rolling back a created page with no original page to restore; ModelManager still references the deleted page.');
        }
        page.delete();
      } catch (rollbackError) {
        log.error('Error rolling back created page', rollbackError);
      }
    }

    throw new ModelPageBuildError(currentStep, error instanceof Error ? error.message : String(error));
  }
}

/** Where drawRecords records what it made, so a caller can undo it. */
interface DrawnItems {
  blocks: any[];
  lines: any[];
}

/**
 * Draws a document's blocks (generators, activities, resources, in that
 * order) then its lines (connectors, endpoints resolved through the
 * document-id -> Lucid-id map) on `page`, each block at its record's layout
 * position moved by `opts.offset`. Every block and line is recorded in
 * `opts.drawn` as soon as it exists; `opts.onStep` hears the document id of
 * the record being drawn. The page-level model must already be written.
 */
async function drawRecords(
  page: any,
  document: Record<string, any>,
  opts: {
    textSize?: number;
    offset?: { dx: number; dy: number };
    drawn?: DrawnItems;
    onStep: (step: string) => void;
  }
): Promise<{ idMap: Record<string, string> }> {
  const client = ModelManager.getClient();
  const modelManager = ModelManager.getInstance();
  const factory = newElementFactory(modelManager);
  const idMap: Record<string, string> = {};
  const dx = opts.offset?.dx ?? 0;
  const dy = opts.offset?.dy ?? 0;

  // Loaded ONCE for the whole page -- not per block.
  await client.loadBlockClasses(['ProcessBlock']);

  // A document that carries a block's size (the onboarding example, from
  // drawio's geometry) is drawn at it; mixing sizes otherwise misaligns
  // centres and bends the connecting lines. Advisor documents carry none.
  const blockBox = (record: Record<string, any>) => ({
    x: (Number(record.x) || 0) + dx,
    y: (Number(record.y) || 0) + dy,
    w: Number(record.width) || 80,
    h: Number(record.height) || 80,
  });
  const styleText = async (block: any) => {
    if (opts.textSize !== undefined) await block.textStyles.set('Text', { size: opts.textSize });
  };
  // The record helpers only add blocks and lines; this stand-in for the page
  // records each one the moment Lucid hands it back, so a failure later in the
  // same record still undoes it.
  const recordingPage = {
    addBlock: (def: unknown) => {
      const block = page.addBlock(def);
      opts.drawn?.blocks.push(block);
      return block;
    },
    addLine: (def: unknown) => {
      const line = page.addLine(def);
      opts.drawn?.lines.push(line);
      return line;
    },
  };

  // Each createBlockRecord/createLineRecord call below runs
  // registerElement, which -- while the ModelDefinition is dirty --
  // triggers a full ensureModelDefinition() rebuild from storage. That
  // makes this loop O(n) rebuilds for an n-element page, not one; fine for
  // Advisor- and example-sized models.
  const generators = (document.generators ?? []) as Array<Record<string, any>>;
  for (const record of generators) {
    opts.onStep(String(record.id));
    const created = await createBlockRecord(recordingPage, modelManager, factory, 'Generator', blockBox(record), stripGeometry(record));
    await styleText(created.block);
    idMap[String(record.id)] = created.id;
  }

  const activities = (document.activities ?? []) as Array<Record<string, any>>;
  for (const record of activities) {
    opts.onStep(String(record.id));
    const created = await createBlockRecord(recordingPage, modelManager, factory, 'Activity', blockBox(record), stripGeometry(record));
    await styleText(created.block);
    idMap[String(record.id)] = created.id;
  }

  const resources = (document.resources ?? []) as Array<Record<string, any>>;
  for (const record of resources) {
    opts.onStep(String(record.id));
    const created = await createResourceBlockRecord(recordingPage, modelManager, blockBox(record), stripGeometry(record));
    await styleText(created.block);
    idMap[String(record.id)] = created.id;
  }

  const connectors = (document.connectors ?? []) as Array<Record<string, any>>;
  for (const record of connectors) {
    opts.onStep(String(record.id));
    const sourceDocId = record.sourceId;
    const targetDocId = record.targetId;

    const sourceLucidId = sourceDocId !== undefined ? idMap[String(sourceDocId)] : undefined;
    if (!sourceLucidId) {
      throw new Error(`Connector source not found: ${sourceDocId}`);
    }
    const targetLucidId = targetDocId !== undefined ? idMap[String(targetDocId)] : undefined;
    if (!targetLucidId) {
      throw new Error(`Connector target not found: ${targetDocId}`);
    }

    const created = await createLineRecord(
      recordingPage,
      modelManager,
      factory,
      page.allBlocks.get(sourceLucidId),
      page.allBlocks.get(targetLucidId),
      stripGeometry(record)
    );
    idMap[String(record.id)] = created.id;
  }

  return { idMap };
}

/**
 * True when the model on `page` has no activities, generators or resources
 * (records, not shapes) -- the rule Studio's `modelIsEmpty` and the API's
 * `model_is_empty` use. A page with no Quodsi model at all is empty too:
 * there is nothing on it a draw could clobber.
 */
export async function pageModelIsEmpty(page: PageProxy): Promise<boolean> {
  const modelManager = ModelManager.getInstance();
  if (modelManager.getCurrentPageId() !== page.id) modelManager.setCurrentPage(page);
  const definition = await modelManager.getModelDefinition();
  if (!definition) return true;
  return definition.activities.getAll().length === 0
    && definition.generators.getAll().length === 0
    && definition.resources.getAll().length === 0;
}

/** Records of `incoming` replace same-id records of `existing`, whose others stay. */
function mergeById<T>(existing: T[], incoming: T[]): T[] {
  const ids = new Set(incoming.map((r) => String((r as any)?.id)));
  return [...incoming, ...existing.filter((r) => !ids.has(String((r as any)?.id)))];
}

/** The gap between the shapes already on a page and a model drawn beside them. */
const IN_PLACE_MARGIN = 120;

/**
 * Moves the document's layout clear of the blocks already on `page`: to the
 * right of their bounding box by IN_PLACE_MARGIN, top-aligned with it. The
 * document's own positions are kept as offsets. Nothing on the page: no move.
 */
function offsetBesideExisting(page: any, document: Record<string, any>): { dx: number; dy: number } {
  const existing = Array.from(page.allBlocks.values() as Iterable<any>).map((b) => b.getBoundingBox());
  if (existing.length === 0) return { dx: 0, dy: 0 };
  const records: Array<Record<string, any>> = [].concat(
    document.generators ?? [], document.activities ?? [], document.resources ?? []);
  const docMinX = records.length ? Math.min(...records.map((r) => Number(r.x) || 0)) : 0;
  const docMinY = records.length ? Math.min(...records.map((r) => Number(r.y) || 0)) : 0;
  const maxX = Math.max(...existing.map((b) => b.x + b.w));
  const minY = Math.min(...existing.map((b) => b.y));
  return { dx: maxX + IN_PLACE_MARGIN - docMinX, dy: minY - docMinY };
}

/**
 * Draws `document` on `page` -- the page showing, whose model the caller has
 * found empty -- instead of on a new page. No page is added or switched to,
 * the page keeps its name, and the model keeps its id (documentId:pageId).
 *
 * Merges, never replaces: run settings go over the page's own (all but the
 * name: the model keeps its name too), and the model-root lists, states and
 * entities merge by id with the document's records winning (drawio's
 * mergeModelBlob rule). The blocks land clear of the shapes already there.
 *
 * Any failure undoes the draw: every line then every block it made is
 * removed (removeElement before delete), the page's model keys are put back
 * as they were, and a ModelPageBuildError naming the step is thrown.
 */
export async function drawModelInPage(
  page: PageProxy,
  document: Record<string, any>
): Promise<{ page: PageProxy; idMap: Record<string, string> }> {
  const modelManager = ModelManager.getInstance();
  const storage = modelManager.getStorageAdapter();
  if (modelManager.getCurrentPageId() !== page.id) modelManager.setCurrentPage(page);

  const snapshot = storage.snapshotPageModel(page);
  const drawn: DrawnItems = { blocks: [], lines: [] };
  // Measured before anything is drawn, so the model goes beside what was there.
  const offset = offsetBesideExisting(page, document);
  let currentStep = 'page settings';

  try {
    const runSettings: JsonObject = {};
    for (const key of RUN_SETTINGS_KEYS) {
      if (key !== 'name' && key in document) {
        (runSettings as any)[key] = document[key];
      }
    }
    // saveElementData merges a Model patch into the page's stored record.
    await modelManager.saveElementData(page, { ...runSettings, id: page.id }, SimulationObjectType.Model, page);

    currentStep = 'model root';
    const stored: Record<(typeof MODEL_ROOT_KEYS)[number], () => unknown[]> = {
      resources: () => storage.getResources(page),
      resourceRequirements: () => storage.getResourceRequirements(page),
      arrivalPatterns: () => storage.getArrivalPatterns(page),
      arrivalSchedules: () => storage.getArrivalSchedules(page),
      workSchedules: () => storage.getWorkSchedules(page),
    };
    const rootPatch: Record<string, unknown> = {};
    for (const key of MODEL_ROOT_KEYS) {
      if (key in document) {
        const incoming = key === 'resources'
          ? (document.resources as Array<Record<string, any>>).map(stripGeometry)
          : document[key];
        rootPatch[key] = mergeById(stored[key](), incoming as unknown[]);
      }
    }
    await modelManager.updateModelRoot(rootPatch, page);

    if ('states' in document) {
      currentStep = 'states';
      await modelManager.updateStates(mergeById(storage.getStates(page) as any[], document.states), page);
    }
    if ('entities' in document) {
      currentStep = 'entities';
      await modelManager.updateEntities(mergeById(storage.getEntities(page) as any[], document.entities), page);
    }

    const { idMap } = await drawRecords(page, document, {
      offset,
      drawn,
      onStep: (step) => { currentStep = step; },
    });

    await modelManager.validateModel();
    return { page, idMap };
  } catch (error) {
    log.error('Error drawing the model on its page', error);
    await undoDraw(page, drawn, snapshot);
    throw new ModelPageBuildError(currentStep, error instanceof Error ? error.message : String(error));
  }
}

/** Removes what a failed drawModelInPage made (lines first) and restores the page's model keys. */
async function undoDraw(page: PageProxy, drawn: DrawnItems, snapshot: Record<string, unknown>): Promise<void> {
  const modelManager = ModelManager.getInstance();
  for (const item of [...[...drawn.lines].reverse(), ...[...drawn.blocks].reverse()]) {
    try {
      await modelManager.removeElement(item.id);
      item.delete();
    } catch (rollbackError) {
      log.error('Error removing a drawn item while undoing a draw', rollbackError);
    }
  }
  try {
    modelManager.getStorageAdapter().restorePageModel(page, snapshot);
  } catch (rollbackError) {
    log.error('Error restoring the page model while undoing a draw', rollbackError);
  }
  modelManager.invalidateModelCache();
}
