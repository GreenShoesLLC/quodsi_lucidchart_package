/**
 * Scenario-lever authoring BLOCKER: the model serializer that produces the
 * submitted model (-> backend `model_definition_snapshot`) dropped the `levers`
 * field on Resource/Activity/Generator, so authored levers never reached the
 * Studio Study form's lever roster.
 *
 * These tests pin the fix:
 *   - a component WITH levers serializes them (round-trippable, equal).
 *   - a component WITHOUT levers OMITS the key entirely (conditional inclusion
 *     => no snapshot churn for the overwhelmingly common lever-less model).
 *
 * We go through the public serialize() entry-point because the per-component
 * serialize methods are protected.
 */
import { ModelSerializerFactory } from '../../src/serialization/ModelSerializerFactory';
import { Model } from '@quodsi/lucid-shared';
import { ModelDefinition } from '@quodsi/shared';
import { Activity } from '@quodsi/shared';
import { Resource } from '@quodsi/shared';
import { Generator } from '@quodsi/shared';
import { EntitySourceConfig } from '@quodsi/shared';
import { GeneratorType } from '@quodsi/lucid-shared';
import { Duration } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { ConstantDistribution } from '@quodsi/shared';
import { createScenarioLever, ScenarioPropertyName } from '@quodsi/lucid-shared';
import type { ScenarioLever } from '@quodsi/lucid-shared';

/**
 * Build a minimal valid ModelDefinition with one activity, one resource, and a
 * generator. Optional callbacks let a test attach levers to a component before
 * the model is returned.
 */
function buildModel(opts?: {
    onActivity?: (a: Activity) => void;
    onResource?: (r: Resource) => void;
    onGenerator?: (g: Generator) => void;
}): ModelDefinition {
    const model = Model.createDefault('lever-test-model');
    model.name = 'Lever Serialization Test Model';
    const modelDef = new ModelDefinition(model);

    const activity = new Activity('activity-1', 'Activity1', 1, 1, 1, []);
    opts?.onActivity?.(activity);
    modelDef.activities.add(activity);

    const resource = new Resource('resource-1', 'Resource1', 1);
    opts?.onResource?.(resource);
    modelDef.resources.add(resource);

    const entityId = modelDef.entities.getAll()[0].id;
    const generationConfig: EntitySourceConfig = {
        entityId,
        generatorType: GeneratorType.FREQUENCY,
        periodicOccurrences: 10,
        periodIntervalDuration: new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)),
        entitiesPerCreation: 1,
        periodicStartDuration: new Duration(PeriodUnit.HOURS, ConstantDistribution.create(0)),
        maxEntities: 999999,
        timeDistributedConfigIds: [],
        initialStateModifications: []
    };
    const generator = new Generator('generator-1', 'Generator1', generationConfig, 'activity-1');
    opts?.onGenerator?.(generator);
    modelDef.generators.add(generator);

    return modelDef;
}

function serialize(modelDef: ModelDefinition) {
    return ModelSerializerFactory.create(modelDef).serialize(modelDef);
}

describe('ModelDefinitionSerializer carries component levers', () => {
    it('serializes a Resource lever (present + equal)', () => {
        const lever = createScenarioLever({
            propertyName: ScenarioPropertyName.CAPACITY,
            label: 'Nurses',
            leverId: 'lever-resource-fixed'
        });
        const modelDef = buildModel({
            onResource: (r) => { r.levers = [lever]; }
        });

        const serialized = serialize(modelDef);
        const resource = serialized.resources[0] as { levers?: ScenarioLever[] };

        expect(resource.levers).toBeDefined();
        expect(resource.levers).toHaveLength(1);
        expect(resource.levers).toEqual([lever]);
    });

    it('serializes an Activity lever (present + equal)', () => {
        const lever = createScenarioLever({
            propertyName: ScenarioPropertyName.ACTIVITY_CAPACITY,
            label: 'Bays',
            leverId: 'lever-activity-fixed'
        });
        const modelDef = buildModel({
            onActivity: (a) => { a.levers = [lever]; }
        });

        const serialized = serialize(modelDef);
        const activity = serialized.activities[0] as { levers?: ScenarioLever[] };

        expect(activity.levers).toBeDefined();
        expect(activity.levers).toEqual([lever]);
    });

    it('serializes a Generator lever (present + equal)', () => {
        const lever = createScenarioLever({
            propertyName: ScenarioPropertyName.INTERARRIVAL_TIMING,
            label: 'Arrival rate',
            leverId: 'lever-generator-fixed'
        });
        const modelDef = buildModel({
            onGenerator: (g) => { g.levers = [lever]; }
        });

        const serialized = serialize(modelDef);
        const generator = serialized.generators[0] as { levers?: ScenarioLever[] };

        expect(generator.levers).toBeDefined();
        expect(generator.levers).toEqual([lever]);
    });

    it('OMITS the levers key when a component has no levers (no snapshot churn)', () => {
        // buildModel leaves all components with the default empty levers[].
        const modelDef = buildModel();
        const serialized = serialize(modelDef);

        expect('levers' in (serialized.resources[0] as object)).toBe(false);
        expect('levers' in (serialized.activities[0] as object)).toBe(false);
        expect('levers' in (serialized.generators[0] as object)).toBe(false);
    });
});
