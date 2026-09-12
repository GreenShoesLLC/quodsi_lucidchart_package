import { ISerializedArrivalPattern } from '../serialization/interfaces/ISerializedArrivalPattern';
import { ISerializedArrivalSchedule } from '../serialization/interfaces/ISerializedArrivalSchedule';
import { ISerializedWorkSchedule } from '../serialization/interfaces/ISerializedWorkSchedule';
import { ISerializedResourceRequirement } from '../serialization/interfaces/ISerializedResourceRequirement';
import { ISerializedDuration } from '../serialization/interfaces/ISerializedDuration';
import type { EditorReferenceActionSummary, EditorReferenceStateModification } from './EditorReferenceData';

/**
 * The model's own fields as a MODEL_ROOT_SNAPSHOT carries them: the
 * MODEL_FIELD_KEYS roster (@quodsi/shared modelFields.ts) as plain data.
 * Dates are ISO strings or null; `levers` is always an array. The snapshot
 * carries them flat (what Lucid's Model editor drafts from) AND under `model`
 * (what the shared modals' calendar math reads).
 */
export type ModelRootModelFields = {
    id?: string;
    name?: string;
    description?: string;
    replications?: number;
    seed?: number;
    timeUnit?: string;
    timeMode?: string;
    warmupTime?: ISerializedDuration;
    runTime?: ISerializedDuration;
    warmupDateTime?: string | null;
    startDateTime?: string | null;
    finishDateTime?: string | null;
    levers?: unknown[];
};

/**
 * Plain-data projection of the model root read by shared cross-platform
 * panels, and since 2026-09-12 the ONLY data source of Lucid's Model editor
 * (spec lucid-model-accessor). NOT `ISerializedModel`: that wire shape is flat
 * by design and carries no collections. This mirrors drawio's
 * `wrapProjectionAsModelDefinition`.
 *
 * Lives in `lucid-shared` (not the editor extension) so both ends of the
 * MODEL_ROOT_SNAPSHOT seam -- the host, which builds it in
 * `projectModelRoot`, and `quodsim-react`, which reads it out of the message
 * -- reference one definition. A hand-redeclared copy on either side can drift
 * silently: the React panel would read the wrong key and render blank rather
 * than error.
 *
 * Activity, generator and connector rows are SUMMARIES (the shapes
 * referenceDataBuilder sends, built by the extension's referenceSummaries.ts),
 * never whole domain records: the snapshot is posted after every model-root
 * write, so every field added here rides the wire each time.
 */
export type ModelRootProjection = ModelRootModelFields & {
    // The Lucid page this snapshot was built for (spec 2026-09-11 page guard).
    // Stamped by ModelManager.buildModelRootProjection; panel writes echo it
    // back as basedOnPageId so the host can refuse a write aimed at another page.
    pageId?: string;
    // Panel-local, never sent by the host: stamped by the panel's
    // createModelRootSource.acceptSnapshot (an increasing counter; an
    // optimistic echo keeps the current value) so an editor can tell a
    // snapshot that arrived AFTER its write settled from one that was already
    // in flight. saveModel sends only the patch, so it never rides the wire.
    snapshotSeq?: number;
    generators: Array<{
        id: string;
        name: string;
        levers?: unknown[];
        entityId?: string;
        mode?: string;
        arrivalPatternId?: string;
        // The SCHEDULED-mode sibling of arrivalPatternId. Without it
        // ScheduleModal resolves no schedule for any generator, and its first
        // edit mints a duplicate schedule and orphans the original.
        arrivalScheduleId?: string;
        volume?: number;
        interarrivalTime?: ISerializedDuration;
        initialStates?: EditorReferenceStateModification[];
        routing?: string;
    }>;
    arrivalPatterns: ISerializedArrivalPattern[];
    // Optional only to avoid churning ~65 fixture literals; projectModelRoot
    // populates this and every optional list below on every path.
    arrivalSchedules?: ISerializedArrivalSchedule[];
    // Entities carry `description` for the shared EntitiesEditor;
    // ScheduleTable/SchedulePasteImport read only id + name.
    entities?: Array<{ id: string; name: string; description?: string }>;
    // Full rows (ISerializedState without the class tag): the Model editor's
    // States tab lists and edits them. ScheduleTable reads only id + name.
    states?: Array<{
        id: string;
        name: string;
        componentType?: string;
        dataType?: string;
        initialValue?: unknown;
        categoryValues?: unknown;
        description?: string;
        collectStatistics?: boolean;
    }>;
    // Lucid global resources (Plan 2b). shapeId/shapeLabel/laneRef are
    // TRANSIENT link markers stamped at build time for the Resources tab's
    // status column -- this projection is a panel view, not the engine wire.
    resources?: Array<{
        id: string;
        name: string;
        capacity?: number;
        description?: string;
        financialProperties?: {
            enabled: boolean;
            costPerSeize: number;
            costPerHourUtilized: number;
            costPerHourIdle: number;
        };
        levers?: unknown[];
        // The resource half of the work-schedule link (CapacitySourcePicker,
        // workScheduleUsage). Absent means fixed capacity.
        workScheduleId?: string;
        shapeId?: string;
        shapeLabel?: string;
        laneRef?: { blockId: string; laneId: string };
    }>;
    resourceRequirements?: ISerializedResourceRequirement[];
    // Model-level work schedules (spec 2026-08-27 §3.1).
    workSchedules?: ISerializedWorkSchedule[];
    // Activity summaries plus what the Model editor's tabs count off them:
    // the work-schedule link (Schedules usage and delete guard), the arrival
    // links of a self-generating activity (Arrivals usage), and levers (the
    // delete dialogs' lever count).
    activities?: Array<{
        id: string;
        name: string;
        workScheduleId?: string;
        routing?: string;
        actions?: EditorReferenceActionSummary[];
        sourceConfig?: {
            initialStates?: EditorReferenceStateModification[];
            arrivalPatternId?: string;
            arrivalScheduleId?: string;
        };
        failureProperties?: { repairResourceRequirementId?: string };
        levers?: unknown[];
    }>;
    // Geometry-free connector summaries: routing fields, action summaries and
    // levers, for the delete dialogs and the state-delete preview.
    connectors?: Array<{
        id: string;
        name: string;
        sourceId: string;
        targetId: string;
        weight?: number;
        priority?: number;
        entityId?: string;
        condition?: unknown;
        actions?: EditorReferenceActionSummary[];
        levers?: unknown[];
    }>;
    model: ModelRootModelFields;
};
