// editorextensions/quodsi_editor_extension/src/core/modelRootProjection.ts
//
// The ModelDefinition -> ModelRootProjection mapping, extracted verbatim from
// ModelManager.buildModelRootProjection, which now delegates to it and keeps
// only the page-resolution half (setCurrentPage / getModelDefinition).
//
// WHY IT LIVES IN ITS OWN FILE. This mapping is the producing end of the
// MODEL_ROOT_SNAPSHOT seam; the consuming end is quodsi_studio's shared panels
// (GeneratorPatternTab, ScheduleModal) rendered inside quodsim-react. Until
// 2026-08-19 nothing tested the two together, because ModelManager cannot be
// imported from quodsim-react's Vitest suite: it pulls in lucid-extension-sdk
// and the extension's messaging barrel, and typechecking it under
// quodsim-react's tsconfig (different globals, isolatedModules on) fails
// outright. So the projection could -- and did -- silently omit three fields
// ScheduleModal reads, with every suite green, because every read on the
// consuming side is defensive (`?? []`, `?.`) and renders empty instead of
// throwing.
//
// Split out, the mapping has no dependency beyond @quodsi/lucid-shared, so
// quodsim-react's suite can run the REAL producer against the REAL consumer:
// see quodsim-react/src/features/schedule/__tests__/
// ScheduleModal.projection.test.tsx. The extension's own
// tests/core/modelManager.buildModelRootProjection.test.ts continues to cover
// the page half plus the delegation.
//
// WHEN YOU ADD A FIELD HERE, add it to ModelRootProjection in lucid-shared
// too: the type is shared by both ends of the seam precisely so a
// hand-redeclared copy cannot drift (see that file's own header).

import {
    ISerializedArrivalPattern,
    ISerializedArrivalSchedule,
    ISerializedResourceRequirement,
    ModelDefinition,
    ModelRootProjection,
    Resource,
} from "@quodsi/lucid-shared";

/**
 * One row of `ModelRootProjection.resources` -- the shape ResourcesEditor
 * (quodsi_studio/src/platforms/shared/panels/ResourcesEditor.tsx) reads.
 * Declared here (module scope) rather than inline so the `financialProperties`
 * cast below has somewhere to point.
 */
type ProjectedResource = NonNullable<ModelRootProjection['resources']>[number];

/** The empty projection, used when the page has no ModelDefinition at all. */
export function emptyModelRootProjection(): ModelRootProjection {
    return {
        generators: [],
        arrivalPatterns: [],
        arrivalSchedules: [],
        entities: [],
        states: [],
        resources: [],
        resourceRequirements: [],
        model: {},
    };
}

const toIso = (v: Date | null | undefined): string | null =>
    v ? v.toISOString() : null;

/**
 * Project a ModelDefinition into the plain-data shape the shared panels read.
 *
 * NOT ISerializedModel: that wire shape is flat by design (no nested `model`
 * block) and carries warmupTime/runTime as Durations rather than the
 * warmupDateTime/finishDateTime the pattern cascade's date math needs.
 */
export function projectModelRoot(def: ModelDefinition | null | undefined): ModelRootProjection {
    if (!def) {
        return emptyModelRootProjection();
    }

    return {
        generators: def.generators.getAll().map(g => ({
            id: g.id,
            name: g.name,
            levers: g.levers,
            entityId: g.entityId,
            mode: g.mode,
            arrivalPatternId: g.arrivalPatternId,
            // SCHEDULED's counterpart to arrivalPatternId. Omitting it made
            // ScheduleModal (ScheduleModal.tsx:119) read `undefined` for every
            // generator in Lucid: the linked schedule was never found, the
            // table rendered empty, and the first edit took updateSchedule's
            // create-branch -- minting a DUPLICATE schedule and relinking the
            // generator to it, orphaning the original beyond the reach of
            // either cleanup path (both key off the generator's CURRENT
            // arrivalScheduleId).
            arrivalScheduleId: g.arrivalScheduleId,
            volume: g.volume,
        })),
        arrivalPatterns: def.arrivalPatterns.getAll()
            .map(p => p.toJSON()) as ISerializedArrivalPattern[],
        arrivalSchedules: def.arrivalSchedules.getAll()
            .map(s => s.toJSON()) as ISerializedArrivalSchedule[],
        // id + name ONLY -- exactly what ScheduleModal.tsx:111-114 reads and
        // forwards to ScheduleTable/SchedulePasteImport, whose props are typed
        // `{ id: string; name: string }[]` (ScheduleTable.tsx:42-43). NOT
        // `.toJSON()` / whole domain objects: that would put every future
        // Entity/State field onto the MODEL_ROOT_SNAPSHOT wire for no consumer.
        // Without these two, the per-row Entity and State dropdowns were empty
        // in Lucid, so no scheduled arrival could be given the entityId the
        // engine requires and the document was rejected wholesale.
        entities: def.entities.getAll().map(e => ({ id: e.id, name: e.name })),
        states: def.states.getAll().map(s => ({ id: s.id, name: s.name })),
        // Lucid global resources (Plan 2b). shapeId/shapeLabel/laneRef are
        // TRANSIENT link markers -- stamped in-memory on the Resource
        // instance at builder time (ModelDefinitionPageBuilder, via
        // resolveResourceLinks), never on the class and never emitted by
        // Resource.toJSON() -- so they must be read through an intersection
        // cast, not the declared Resource type. ResourcesEditor's status
        // column is the sole reason they're projected at all: a shape-linked
        // row shows the linked shape's name, a lane-linked row shows "lane",
        // and a row with neither shows "no shape" (both wording paths read
        // straight off these three fields).
        resources: def.resources.getAll().map(r => {
            const t = r as Resource & { shapeId?: string; shapeLabel?: string; laneRef?: { blockId: string; laneId: string } };
            const fp = r.financialProperties as { toJSON?: () => ProjectedResource['financialProperties'] } | undefined;
            return {
                id: r.id,
                name: r.name,
                capacity: r.capacity,
                description: r.description,
                financialProperties: fp?.toJSON ? fp.toJSON() : (fp as ProjectedResource['financialProperties']),
                levers: r.levers,
                shapeId: t.shapeId,
                shapeLabel: t.shapeLabel,
                laneRef: t.laneRef,
            };
        }),
        resourceRequirements: def.resourceRequirements.getAll().map(q => q.toJSON()) as ISerializedResourceRequirement[],
        model: {
            timeMode: def.model.timeMode,
            startDateTime: toIso(def.model.startDateTime),
            warmupDateTime: toIso(def.model.warmupDateTime),
            finishDateTime: toIso(def.model.finishDateTime),
        },
    };
}
