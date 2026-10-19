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
  opts: { title: string }
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

    const factory = newElementFactory(modelManager);
    const idMap: Record<string, string> = {};

    // Loaded ONCE for the whole page -- not per block.
    await client.loadBlockClasses(['ProcessBlock']);

    const blockBox = (record: Record<string, any>) => ({
      x: Number(record.x) || 0,
      y: Number(record.y) || 0,
      w: 80,
      h: 80,
    });

    // Each createBlockRecord/createLineRecord call below runs
    // registerElement, which -- while the ModelDefinition is dirty --
    // triggers a full ensureModelDefinition() rebuild from storage. That
    // makes this loop O(n) rebuilds for an n-element page, not one; fine for
    // Advisor- and example-sized models.
    const generators = (document.generators ?? []) as Array<Record<string, any>>;
    for (const record of generators) {
      currentStep = String(record.id);
      const created = await createBlockRecord(page, modelManager, factory, 'Generator', blockBox(record), stripGeometry(record));
      idMap[String(record.id)] = created.id;
    }

    const activities = (document.activities ?? []) as Array<Record<string, any>>;
    for (const record of activities) {
      currentStep = String(record.id);
      const created = await createBlockRecord(page, modelManager, factory, 'Activity', blockBox(record), stripGeometry(record));
      idMap[String(record.id)] = created.id;
    }

    const resources = (document.resources ?? []) as Array<Record<string, any>>;
    for (const record of resources) {
      currentStep = String(record.id);
      const created = await createResourceBlockRecord(page, modelManager, blockBox(record), stripGeometry(record));
      idMap[String(record.id)] = created.id;
    }

    const connectors = (document.connectors ?? []) as Array<Record<string, any>>;
    for (const record of connectors) {
      currentStep = String(record.id);
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
        page,
        modelManager,
        factory,
        page.allBlocks.get(sourceLucidId),
        page.allBlocks.get(targetLucidId),
        stripGeometry(record)
      );
      idMap[String(record.id)] = created.id;
    }

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
