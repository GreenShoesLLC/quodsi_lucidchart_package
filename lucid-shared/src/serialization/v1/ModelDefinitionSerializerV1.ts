import { ModelDefinition, MODEL_SCHEMA_VERSION } from '@quodsi/shared';
import { BaseModelDefinitionSerializer } from '../BaseModelDefinitionSerializer';
import { ISchemaVersion } from '../interfaces/ISchemaVersion';
import { ISerializedModelV1 } from './interfaces/ISerializedModelV1';
import { SerializationError } from '../errors/SerializationError';

export class ModelDefinitionSerializerV1 extends BaseModelDefinitionSerializer {
    getVersion(): ISchemaVersion {
        return {
            major: 1,
            minor: 0,
            toString(): string {
                return `${this.major}.${this.minor}`;
            }
        };
    }

    private validateV1Specific(modelDefinition: ModelDefinition): void {
        // Add any V1-specific validation rules
    }

    /**
     * Wire-cleanup Phase B2 Task 9: the model's run parameters (`name`,
     * `replications`, `seed`, `timeUnit`, ...) are spread FLAT onto the
     * document root here — `CleanModelDocument` has no nested `model`
     * sub-object (see `serializeModel`'s doc comment). The whole assembled
     * document is finally round-tripped through `JSON.parse(JSON.
     * stringify(...))` before returning: every `serializeX` helper above
     * delegates to a shared record's own `toJSON()`, which (by design,
     * matching how `JSON.stringify` is meant to invoke it) does NOT
     * eagerly recurse into ITS OWN nested class instances (e.g.
     * `ResourceRequirement.toJSON()` carries `rootClause` through as the
     * live `RequirementClause` instance, not `rootClause.toJSON()`). A
     * single top-level stringify/parse pass realizes every level's sparse,
     * plain-JSON shape exactly once — matching what downstream consumers
     * (`SwimLaneResourceInjector`, `offsetSerializedModelCoordinates`, the
     * serialization snapshot tests, and ultimately the HTTP body actually
     * uploaded) need: a fully plain, already-sparse object, not a tree of
     * live class instances.
     */
    serialize(modelDefinition: ModelDefinition): ISerializedModelV1 {
        try {
            // Validate the model
            this.validateModel(modelDefinition);
            this.validateV1Specific(modelDefinition);

            const metadata = this.getMetadata();

            // `states`/`entities`/`resources`/`resourceRequirements`/`activities`/
            // `generators`/`connectors` are all REQUIRED keys on `CleanModelDocument`
            // (root.py) — always present, even as `[]`. `scenarios` (a loose,
            // engine-ignored Studio passthrough) is genuinely `Optional[List[dict]]
            // = None` — sparse-omitted here when empty, matching the engine's own
            // writer (`scaffold_clean.json` carries neither an empty `states` array
            // scenario here nor a `scenarios` key at all when there is nothing to say).
            const scenarios = modelDefinition.scenarios.getAll().map(scenario => scenario.toJSON());

            const document = {
                schemaVersion: MODEL_SCHEMA_VERSION,
                metadata,
                ...this.serializeModel(modelDefinition.model),
                entities: modelDefinition.entities.getAll().map(entity =>
                    this.serializeEntity(entity)
                ),
                activities: modelDefinition.activities.getAll().map(activity =>
                    this.serializeActivity(activity)
                ),
                resources: modelDefinition.resources.getAll().map(resource =>
                    this.serializeResource(resource)
                ),
                generators: modelDefinition.generators.getAll().map(generator =>
                    this.serializeGenerator(generator)
                ),
                connectors: modelDefinition.connectors.getAll().map(connector =>
                    this.serializeConnector(connector)
                ),
                resourceRequirements: modelDefinition.resourceRequirements.getAll().map(requirement =>
                    this.serializeResourceRequirement(requirement)
                ),
                states: modelDefinition.states.getAll().map(state =>
                    this.serializeState(state)
                ),
                scenarios: scenarios.length ? scenarios : undefined
            };

            return JSON.parse(JSON.stringify(document)) as ISerializedModelV1;
        } catch (error) {
            if (error instanceof SerializationError) {
                throw error;
            }
            throw new SerializationError(
                'Model',
                'Failed to serialize model definition',
                error instanceof Error ? error : undefined
            );
        }
    }
}
