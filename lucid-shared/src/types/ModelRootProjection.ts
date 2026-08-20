import { ISerializedArrivalPattern } from '../serialization/interfaces/ISerializedArrivalPattern';
import { ISerializedArrivalSchedule } from '../serialization/interfaces/ISerializedArrivalSchedule';

/**
 * Plain-data projection of the model root read by shared cross-platform
 * panels (starting with `GeneratorPatternTab`). NOT `ISerializedModel`: that
 * wire shape is flat by design (no nested `model` block) and carries
 * `warmupTime`/`runTime` as Durations, not the `warmupDateTime`/
 * `finishDateTime` the cascade editor's date math needs. This mirrors
 * drawio's `wrapProjectionAsModelDefinition`.
 *
 * Lives in `lucid-shared` (not the editor extension) so both ends of the
 * MODEL_ROOT_SNAPSHOT seam -- the host, which builds it in
 * `ModelManager.buildModelRootProjection`, and `quodsim-react`, which reads
 * it out of the message -- reference one definition. A hand-redeclared copy
 * on either side can drift silently: the React panel would read the wrong
 * key and just render blank rather than error.
 */
export type ModelRootProjection = {
    generators: Array<{
        id: string;
        name: string;
        levers?: unknown[];
        entityId?: string;
        mode?: string;
        arrivalPatternId?: string;
        // The SCHEDULED-mode sibling of arrivalPatternId. Absent from this
        // projection until 2026-08-19, which made ScheduleModal
        // (quodsi_studio/src/platforms/shared/panels/ScheduleModal.tsx:119,
        // `const scheduleId = generator.arrivalScheduleId`) resolve
        // `undefined` for EVERY generator in Lucid: the existing schedule was
        // never found, the table rendered empty, and the first edit took
        // updateSchedule's create-branch -- minting a second schedule and
        // relinking the generator to it, orphaning the original beyond the
        // reach of either cleanup path (both key off the generator's CURRENT
        // arrivalScheduleId).
        arrivalScheduleId?: string;
        volume?: number;
    }>;
    arrivalPatterns: ISerializedArrivalPattern[];
    // STILL optional, unlike arrivalPatterns -- NOT because it can genuinely
    // be absent. ModelManager.buildModelRootProjection populates it on every
    // path, same guarantee as arrivalPatterns.
    //
    // The original reason for the `?` ("no UI consumer exists yet") is now
    // STALE: ScheduleModal reads it
    // (quodsi_studio/src/platforms/shared/panels/ScheduleModal.tsx:109).
    // Keeping it optional is a deliberate, separate deferral: making it
    // required invalidates ~57 ModelRootProjection fixture literals across
    // quodsim-react, which is mechanical churn unrelated to the missing-field
    // bug this file's other fields were added to fix. Widen it in its own
    // change and let the fixtures fail until updated.
    arrivalSchedules?: ISerializedArrivalSchedule[];
    // Read by ScheduleModal.tsx:111-114 and handed straight to
    // ScheduleTable/SchedulePasteImport, whose props are literally
    // `{ id: string; name: string }[]` (ScheduleTable.tsx:42-43). Deliberately
    // NOT the full Entity/State domain objects: the panels use id + name and
    // nothing else, and projecting whole objects would put every future field
    // on those classes onto the MODEL_ROOT_SNAPSHOT wire for free.
    //
    // Both were absent until 2026-08-19, so ScheduleModal's `?? []` fallbacks
    // silently produced empty dropdowns in Lucid: no scheduled-arrival row
    // could be given an entityId, and the engine rejects a document whose
    // scheduled arrivals have none.
    entities?: Array<{ id: string; name: string }>;
    states?: Array<{ id: string; name: string }>;
    model: {
        timeMode?: string;
        startDateTime?: string | null;
        warmupDateTime?: string | null;
        finishDateTime?: string | null;
    };
};
