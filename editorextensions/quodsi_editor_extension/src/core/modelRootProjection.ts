// editorextensions/quodsi_editor_extension/src/core/modelRootProjection.ts
//
// The ModelDefinition -> ModelRootProjection mapping, extracted verbatim from
// ModelManager.buildModelRootProjection, which now delegates to it and keeps
// only the page-resolution half (setCurrentPage / getModelDefinition).
//
// WHY IT LIVES IN ITS OWN FILE. This mapping is the producing end of the
// MODEL_ROOT_SNAPSHOT seam; the consuming end is quodsi_studio's shared panels
// rendered inside quodsim-react. ModelManager cannot be imported from
// quodsim-react's Vitest suite: it pulls in lucid-extension-sdk and the
// extension's messaging barrel, and typechecking it under quodsim-react's
// tsconfig fails outright. Split out, the mapping depends only on
// @quodsi/lucid-shared and the pure ./referenceSummaries, so quodsim-react's
// suite runs the REAL producer against the REAL consumer (see
// ScheduleModal.projection.test.tsx, ResourcesTab.projection.test.tsx and the
// Model editor's modelEditorSeam). Keep it that way: never import ModelManager,
// the SDK or the messaging barrel here or in referenceSummaries.ts.
//
// Since 2026-09-12 (spec lucid-model-accessor §1) this snapshot is the ONLY
// data source of Lucid's Model editor, so it also carries the model's own
// fields (flat AND under `model`), full state rows, and the activity,
// generator and connector summaries referenceDataBuilder sends.
//
// WHEN YOU ADD A FIELD HERE, add it to ModelRootProjection in lucid-shared
// too: the type is shared by both ends of the seam precisely so a
// hand-redeclared copy cannot drift.

import {
    ISerializedArrivalPattern,
    ISerializedArrivalSchedule,
    ISerializedWorkSchedule,
    ISerializedResourceRequirement,
    MODEL_DATE_FIELD_KEYS,
    MODEL_FIELD_KEYS,
    ModelDefinition,
    ModelRootModelFields,
    ModelRootProjection,
    Resource,
} from "@quodsi/lucid-shared";
import { summarizeActivity, summarizeConnector, summarizeGenerator, summarizeState } from "./referenceSummaries";

/**
 * One row of `ModelRootProjection.resources` -- the shape ResourcesEditor
 * reads. Declared at module scope so the `financialProperties` cast below has
 * somewhere to point.
 */
type ProjectedResource = NonNullable<ModelRootProjection['resources']>[number];

/** A model date on the snapshot: ISO string, or null when unset or unparseable. */
const toIsoOrNull = (value: unknown): string | null => {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    return null;
};

/**
 * The model's own fields (MODEL_FIELD_KEYS) as plain data: dates as ISO
 * strings or null, `levers` defaulting to []. Every other field is copied as
 * stored (durations stay `{ value, unit }` or distribution objects); a field
 * the model does not carry is left out rather than invented. `scenarios` and
 * the class `type` tag are not model fields and never appear.
 */
export function snapshotModelFields(model: unknown): ModelRootModelFields {
    const source = (model ?? {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of MODEL_FIELD_KEYS) {
        if ((MODEL_DATE_FIELD_KEYS as readonly string[]).includes(key)) {
            out[key] = toIsoOrNull(source[key]);
        } else if (key === 'levers') {
            out[key] = Array.isArray(source[key]) ? source[key] : [];
        } else if (source[key] !== undefined) {
            out[key] = source[key];
        }
    }
    return out as ModelRootModelFields;
}

/** The empty projection, used when the page has no ModelDefinition at all. */
export function emptyModelRootProjection(): ModelRootProjection {
    const fields = snapshotModelFields(null);
    return {
        ...fields,
        generators: [],
        arrivalPatterns: [],
        arrivalSchedules: [],
        workSchedules: [],
        activities: [],
        connectors: [],
        entities: [],
        states: [],
        resources: [],
        resourceRequirements: [],
        model: { ...fields },
    };
}

/** Project a ModelDefinition into the plain-data shape the panels read. */
export function projectModelRoot(def: ModelDefinition | null | undefined): ModelRootProjection {
    if (!def) {
        return emptyModelRootProjection();
    }

    const fields = snapshotModelFields(def.model);

    return {
        ...fields,
        generators: def.generators.getAll().map(g => ({
            ...summarizeGenerator(g),
            levers: g.levers,
            arrivalPatternId: g.arrivalPatternId,
            // SCHEDULED's counterpart to arrivalPatternId. Omitting it made
            // ScheduleModal read `undefined` for every generator in Lucid: the
            // linked schedule was never found and the first edit minted a
            // DUPLICATE schedule, orphaning the original.
            arrivalScheduleId: g.arrivalScheduleId,
            volume: g.volume,
        })),
        arrivalPatterns: def.arrivalPatterns.getAll()
            .map(p => p.toJSON()) as ISerializedArrivalPattern[],
        arrivalSchedules: def.arrivalSchedules.getAll()
            .map(s => s.toJSON()) as ISerializedArrivalSchedule[],
        // Work schedules (spec 2026-08-27 §3.1). `.toJSON()`, never the live
        // object: WorkSchedule carries a `type` field the engine's
        // extra="forbid" clean doc has no slot for, and toJSON() drops it.
        workSchedules: def.workSchedules.getAll()
            .map(w => w.toJSON()) as ISerializedWorkSchedule[],
        activities: def.activities.getAll().map(a => {
            const summary = summarizeActivity(a);
            // A self-generating activity's arrival links: without them an
            // arrival pattern or schedule used only by such an activity looks
            // unused on the Arrivals tab and can be deleted.
            const source = (a as { sourceConfig?: { arrivalPatternId?: string; arrivalScheduleId?: string } }).sourceConfig;
            const arrivalLinks = {
                ...(source?.arrivalPatternId ? { arrivalPatternId: source.arrivalPatternId } : {}),
                ...(source?.arrivalScheduleId ? { arrivalScheduleId: source.arrivalScheduleId } : {}),
            };
            const sourceConfig = summary.sourceConfig || Object.keys(arrivalLinks).length > 0
                ? { ...summary.sourceConfig, ...arrivalLinks }
                : undefined;
            return {
                ...summary,
                sourceConfig,
                // Delete dialogs count the levers on the steps they remove.
                levers: (a.levers ?? []) as unknown[],
                // workScheduleUsage counts activities as well as resources.
                workScheduleId: a.workScheduleId,
            };
        }),
        connectors: def.connectors.getAll().map(c => summarizeConnector(c)),
        // Entities carry `description` for the shared EntitiesEditor. Omitted
        // when empty, matching Entity.toJSON's sparse description.
        entities: def.entities.getAll().map(e => ({
            id: e.id,
            name: e.name,
            ...(e.description ? { description: e.description } : {}),
        })),
        states: def.states.getAll().map(s => summarizeState(s)),
        // Lucid global resources (Plan 2b). shapeId/shapeLabel/laneRef are
        // TRANSIENT link markers stamped in-memory at builder time, never on
        // the class and never emitted by Resource.toJSON(), so they are read
        // through an intersection cast.
        resources: def.resources.getAll().map(r => {
            const t = r as Resource & { shapeId?: string; shapeLabel?: string; laneRef?: { blockId: string; laneId: string } };
            const fp = r.financialProperties as { toJSON?: () => ProjectedResource['financialProperties'] } | undefined;
            return {
                id: r.id,
                name: r.name,
                capacity: r.capacity,
                // Absent means "Fixed capacity"; present puts
                // CapacitySourcePicker in its "Follow a schedule" state.
                workScheduleId: r.workScheduleId,
                description: r.description,
                financialProperties: fp?.toJSON ? fp.toJSON() : (fp as ProjectedResource['financialProperties']),
                levers: r.levers,
                shapeId: t.shapeId,
                shapeLabel: t.shapeLabel,
                laneRef: t.laneRef,
            };
        }),
        resourceRequirements: def.resourceRequirements.getAll().map(q => q.toJSON()) as ISerializedResourceRequirement[],
        model: { ...fields },
    };
}
