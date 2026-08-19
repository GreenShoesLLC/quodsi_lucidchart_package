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
        volume?: number;
    }>;
    arrivalPatterns: ISerializedArrivalPattern[];
    // TEMPORARILY optional, unlike arrivalPatterns -- NOT because it can
    // genuinely be absent. ModelManager.buildModelRootProjection populates
    // it on every path, same guarantee as arrivalPatterns. It's optional
    // only because no UI consumer exists yet: the task that adds one will
    // touch quodsim-react's ModelRootProjection fixtures anyway, with real
    // assertions on schedule content, so widening ~57 fixture literals here
    // first (with nothing to assert) would be premature churn. Make this
    // required at that point and let the fixtures fail until updated.
    arrivalSchedules?: ISerializedArrivalSchedule[];
    model: {
        timeMode?: string;
        startDateTime?: string | null;
        warmupDateTime?: string | null;
        finishDateTime?: string | null;
    };
};
