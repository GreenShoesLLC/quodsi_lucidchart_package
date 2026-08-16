import { ModelDefinition } from '@quodsi/shared';
import { Activity } from '@quodsi/shared';
import { Entity } from '@quodsi/shared';
import { Generator } from '@quodsi/shared';
import { Resource } from '@quodsi/shared';
import { ResourceRequirement } from '@quodsi/shared';
import { DomainModel as Model } from '@quodsi/shared';
import { Connector } from '@quodsi/shared';
import { Duration } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { ModelDefaults } from '@quodsi/shared';
import { State } from '@quodsi/shared';
import { ComponentType } from '@quodsi/shared';
import { StateType } from '@quodsi/shared';
import { MODEL_SCHEMA_VERSION } from '@quodsi/shared';

import { IModelDefinitionSerializer } from './interfaces/IModelDefinitionSerializer';
import { ISerializedModel } from './interfaces/ISerializedModel';
import { ISerializedActivity } from './interfaces/ISerializedActivity';
import { ISerializedEntity } from './interfaces/ISerializedEntity';
import { ISerializedGenerator } from './interfaces/ISerializedGenerator';
import { ISerializedResource } from './interfaces/ISerializedResource';
import { ISerializedResourceRequirement } from './interfaces/ISerializedResourceRequirement';
import { ISerializedConnector } from './interfaces/ISerializedConnector';
import { ISerializedState } from './interfaces/ISerializedState';
import { ISchemaVersion } from './interfaces/ISchemaVersion';
import { SerializationError } from './errors/SerializationError';
import { InvalidModelError } from './errors/InvalidModelError';

/** The model-root run-parameter slice of `ISerializedModel` (name/
 *  replications/seed/timeUnit/timeMode/runTime/warmupTime/startDateTime/
 *  levers/description) — everything `serializeModel` produces, spread onto
 *  the document root by the concrete serializer alongside the element
 *  arrays and the `schemaVersion`/`metadata` stamp. */
export type ISerializedModelRunParams = Pick<
    ISerializedModel,
    'name' | 'description' | 'replications' | 'seed' | 'timeUnit' | 'timeMode' | 'runTime' | 'warmupTime' | 'startDateTime' | 'levers'
>;

export abstract class BaseModelDefinitionSerializer implements IModelDefinitionSerializer {
    /**
     * The serializer's self-reported schema version. Currently has NO production
     * consumer: ModelSerializerFactory.create() dispatches on its `version`
     * argument (not this). `formatVersion` was dropped 2026.08.20 — `schemaVersion`
     * / `metadata.version` (MODEL_SCHEMA_VERSION) now carry the wire-format stamp.
     * Retained as part of the versioned-serializer interface (see
     * serialization/README.md) for a future schema v2; referenced only by tests today.
     */
    abstract getVersion(): ISchemaVersion;

    abstract serialize(modelDefinition: ModelDefinition): ISerializedModel;

    protected validateModel(modelDefinition: ModelDefinition): void {
        if (!modelDefinition) {
            throw new InvalidModelError('ModelDefinition cannot be null or undefined');
        }

        if (!modelDefinition.model) {
            throw new InvalidModelError('Model is required');
        }

        if (!modelDefinition.entities.getAll().length) {
            throw new InvalidModelError('At least one entity is required');
        }
    }

    /**
     * Wire-cleanup Phase B2 Task 9: `CleanModelDocument` (engine
     * `document/clean/root.py`) puts the model's run parameters FLAT ON THE
     * DOCUMENT ROOT — no nested `model` sub-object, and `model.id` has NO
     * clean-wire equivalent at all (dropped, not renamed — see that
     * module's own note to translators). Delegates to `Model.toJSON()`
     * (already clean-shaped and sparse per Task 7) for everything except
     * the CONTAINMENT guarantee `Model.toJSON()` deliberately does not
     * provide: `replications`/`timeUnit`/`runTime` are required, NEVER
     * omitted on the wire, but `Model.toJSON()` only ever omits an
     * `undefined` value — it does not materialize a default. The Lucid host
     * has no `modelFieldDefaults()` spread (unlike drawio/Visio), so a
     * `Model` instance built directly from stored data can genuinely reach
     * this method with `timeUnit`/`runTime` unset. This method is the
     * containment boundary: it guarantees the same three fields the OLD
     * serializer always wrote unconditionally (`oneClockUnit`,
     * `runClockPeriod`/`runClockPeriodUnit`) are still always present,
     * under their new names.
     *
     * `timeMode` is deliberately NOT backfilled here (fix round, review
     * F6): `Model.toJSON()`'s own sparse rule already omits it at its Clock
     * default (`['timeMode', timeMode, SimulationTimeType.Clock]`), and an
     * ABSENT `timeMode` on the clean wire IS "clock" — `CleanModelDocument.
     * time_mode` defaults to `"clock"` too (`root.py`). So an incomplete
     * `Model` with `timeMode` unset serializes to the same wire meaning
     * (clock mode) whether or not this method intervenes; forcing the key
     * present would just be noise, unlike `replications`/`timeUnit`/
     * `runTime`, which have NO default on the engine schema and would
     * otherwise fail validation outright if left absent.
     */
    protected serializeModel(model: Model): ISerializedModelRunParams {
        try {
            if (!model.id || !model.name) {
                throw new InvalidModelError('Model must have id and name');
            }

            const json = model.toJSON() as Record<string, unknown>;

            // Each backfill below only runs when `Model.toJSON()` already
            // omitted the key (i.e. `model.<field>` is itself already
            // undefined/falsy — see that method's own sparse rule for each
            // field) — so there is no live "model has a value but toJSON
            // dropped it anyway" case to additionally guard against here;
            // the materialized value is always the plain host-seed default.
            if (json.replications === undefined) {
                json.replications = ModelDefaults.DEFAULT_REPS;
            }
            if (json.timeUnit === undefined) {
                json.timeUnit = ModelDefaults.DEFAULT_CLOCK_UNIT;
            }
            if (json.runTime === undefined) {
                json.runTime = Duration.toJSON(Duration.constant(24, PeriodUnit.HOURS));
            }

            return json as unknown as ISerializedModelRunParams;
        } catch (error) {
            throw new SerializationError('Model', 'Failed to serialize model properties', error instanceof Error ? error : undefined);
        }
    }

    /**
     * Wire-cleanup Phase B2 Task 9: `CleanEntityDoc` has no `type` class-tag
     * and sparse-omits `x`/`y`/`description` at their defaults — all handled
     * by `Entity.toJSON()`. Nothing Lucid-specific to add.
     */
    protected serializeEntity(entity: Entity): ISerializedEntity {
        try {
            if (!entity.id || !entity.name) {
                throw new InvalidModelError('Entity must have id and name');
            }

            return entity.toJSON() as ISerializedEntity;
        } catch (error) {
            throw new SerializationError('Entity', `Failed to serialize entity "${entity.name}" (ID: ${entity.id})`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Wire-cleanup Phase B2 Task 9: `Activity.toJSON()` already produces the
     * full clean, sparse shape — capacity/inboundCapacity/outboundCapacity/
     * routing/actions (each passed through `sparsifyAction`)/sourceConfig/
     * financialProperties/failureProperties/queueRanking/levers/x/y/width/
     * height. No Lucid-specific concern left to layer on top; the entire
     * hand-rolled action-type switch this method used to contain is gone —
     * `sparsifyAction` (shared) is what the class delegates to internally.
     */
    protected serializeActivity(activity: Activity): ISerializedActivity {
        try {
            if (!activity.id || !activity.name) {
                throw new InvalidModelError('Activity must have id and name');
            }

            return activity.toJSON() as ISerializedActivity;
        } catch (error) {
            throw new SerializationError(
                'Activity',
                `Failed to serialize activity "${activity.name}" (ID: ${activity.id})`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Wire-cleanup Phase B2 Task 9: `Generator.toJSON()` already produces the
     * full clean, sparse, MODE-SCOPED shape (dissolved `generationConfig` —
     * Task 5 — flat on the class since; field groups gated by `mode` inside
     * `generatorCoreEntries`, shared with `Activity.sourceConfig`). No
     * `generationConfig` presence check needed any more — the concept no
     * longer exists. `width`/`height` are dropped unconditionally by the
     * class (no slot on `CleanGeneratorDoc`), so nothing to add here either.
     */
    protected serializeGenerator(generator: Generator): ISerializedGenerator {
        try {
            if (!generator.id || !generator.name) {
                throw new InvalidModelError('Generator must have id and name');
            }

            return generator.toJSON() as ISerializedGenerator;
        } catch (error) {
            throw new SerializationError(
                'Generator',
                `Failed to serialize generator "${generator.name}" (ID: ${generator.id})`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Wire-cleanup Phase B2 Task 9: `Resource.toJSON()` already produces the
     * full clean, sparse shape.
     */
    protected serializeResource(resource: Resource): ISerializedResource {
        try {
            if (!resource.id || !resource.name) {
                throw new InvalidModelError('Resource must have id and name');
            }

            return resource.toJSON() as ISerializedResource;
        } catch (error) {
            throw new SerializationError('Resource', `Failed to serialize resource "${resource.name}" (ID: ${resource.id})`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Wire-cleanup Phase B2 Task 9: `CleanResourceRequirementDoc.rootClause`
     * is a single required clause (Task 6 — the old `rootClauses[]` array's
     * "exactly one root" rule is now structural). `ResourceRequirement.
     * toJSON()` already carries `rootClause` through (as the live
     * `RequirementClause` instance — its own `toJSON()` applies recursively
     * when the whole document is finally stringified).
     */
    protected serializeResourceRequirement(requirement: ResourceRequirement): ISerializedResourceRequirement {
        try {
            if (!requirement.id || !requirement.name) {
                throw new InvalidModelError('ResourceRequirement must have id and name');
            }
            if (!requirement.rootClause) {
                throw new InvalidModelError('ResourceRequirement must have a rootClause');
            }

            return requirement.toJSON() as unknown as ISerializedResourceRequirement;
        } catch (error) {
            throw new SerializationError('ResourceRequirement', `Failed to serialize resource requirement ${requirement.id}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Wire-cleanup Phase B2 Task 9: `Connector.toJSON()` already produces the
     * full clean, sparse shape — `priority`/`entityId`/`condition` renamed
     * from `destinationPriority`/`entityTemplateUniqueId`/`stateCondition`;
     * the old standalone `stateModifications` array has no clean-wire
     * equivalent (folded into an ASSIGN action in `actions` upstream, at
     * authoring time); `description` and the midpoint `x`/`y` are dropped
     * unconditionally (no slot on `CleanConnectorDoc` at all). `sourceX`/
     * `sourceY`/`targetX`/`targetY` DO have a slot (display-only
     * `float = Field(default=0.0, ...)` on the engine doc, `routing.py`) and
     * are carried through, sparse-omitted at 0 — fix round F3: an earlier
     * pass wrongly claimed the connector has no geometry at all. `targetId`
     * is now the sole, canonical destination field directly on the class —
     * the old `getEffectiveDestinationUniqueId()` legacy-fallback concept is
     * gone.
     */
    protected serializeConnector(connector: Connector): ISerializedConnector {
        try {
            if (!connector.id || !connector.sourceId) {
                throw new InvalidModelError('Connector must have id and sourceId');
            }
            if (!connector.targetId) {
                throw new InvalidModelError('Connector must have a targetId');
            }

            return connector.toJSON() as ISerializedConnector;
        } catch (error) {
            throw new SerializationError(
                'Connector',
                `Failed to serialize connector "${connector.name}" (ID: ${connector.id})`,
                error instanceof Error ? error : undefined
            );
        }
    }

    protected serializeState(state: State): ISerializedState {
        try {
            if (!state.id || !state.name) {
                throw new InvalidModelError('State must have id and name');
            }

            return state.toJSON() as ISerializedState;
        } catch (error) {
            throw new SerializationError('State', `Failed to serialize state ${state.id}`, error instanceof Error ? error : undefined);
        }
    }

    protected deserializeState(data: ISerializedState): State {
        try {
            if (!data.id || !data.name) {
                throw new InvalidModelError('Serialized state must have id and name');
            }

            return new State(
                data.id,
                data.name,
                data.componentType as ComponentType,
                data.dataType as StateType,
                data.initialValue,
                {
                    categoryValues: data.categoryValues,
                    description: data.description,
                    collectStatistics: data.collectStatistics
                }
            );
        } catch (error) {
            throw new SerializationError('State', `Failed to deserialize state ${data.id}`, error instanceof Error ? error : undefined);
        }
    }

    protected getMetadata(): { version: string; timestamp: string } {
        try {
            return {
                // `version` is the model-definition schema version (MODEL_SCHEMA_VERSION),
                // mirrored at top-level as `schemaVersion` (formatVersion dropped 2026.08.20).
                version: MODEL_SCHEMA_VERSION,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new SerializationError('Metadata', 'Failed to generate metadata', error instanceof Error ? error : undefined);
        }
    }
}
