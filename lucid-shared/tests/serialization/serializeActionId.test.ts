/**
 * Task 6b-4: serializeAction must emit the action `id` so it reaches the engine.
 *
 * We test via the public serialize() entry-point because serializeAction() is protected.
 * A minimal ModelDefinition is built with one activity containing a SeizeAction (or
 * DelayAction) whose id is fixed, then we assert the serialized action carries the same id.
 */
import { ModelSerializerFactory } from '../../src/serialization/ModelSerializerFactory';
import { Model } from '../../src/types/elements/Model';
import { ModelDefinition } from '@quodsi/shared';
import { Activity } from '@quodsi/shared';
import { Resource } from '@quodsi/shared';
import { ResourceRequirement } from '@quodsi/shared';
import { Generator } from '@quodsi/shared';
import { EntitySourceConfig } from '@quodsi/shared';
import { GeneratorType } from '@quodsi/lucid-shared';
import { Duration } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { ConstantDistribution } from '../../src/types/elements/distributions';
import { createSeizeAction } from '../../src/types/elements/actions/SeizeAction';
import { createDelayAction } from '../../src/types/elements/actions/DelayAction';
import { ISerializedActionBase } from '../../src/serialization/interfaces/ISerializedAction';

/** Helper: build a minimal valid ModelDefinition with the supplied actions on its one activity. */
function buildModelWith(actions: any[]): ModelDefinition {
    const model = Model.createDefault('test-model');
    model.name = 'Action Id Test Model';
    const modelDef = new ModelDefinition(model);

    const activity = new Activity('activity-1', 'Activity1', 1, 1, 1, actions);
    modelDef.activities.add(activity);

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
    modelDef.generators.add(generator);

    return modelDef;
}

describe('serializeAction emits action id (Task 6b-4)', () => {
    it('carries a SeizeAction id through serialization', () => {
        // Need a resource + requirement for SeizeAction
        const model = Model.createDefault('test-model-seize');
        const modelDef = new ModelDefinition(model);

        const resource = new Resource('resource-1', 'Resource1', 1);
        modelDef.resources.add(resource);
        const req = ResourceRequirement.createForSingleResource(resource);
        modelDef.resourceRequirements.add(req);

        const seize = createSeizeAction(req.id, null, 'seize-action-fixed-id');
        expect(seize.id).toBe('seize-action-fixed-id');

        const activity = new Activity('activity-1', 'Activity1', 1, 1, 1, [seize]);
        modelDef.activities.add(activity);

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
        modelDef.generators.add(generator);

        const serializer = ModelSerializerFactory.create(modelDef);
        const serialized = serializer.serialize(modelDef);

        expect(serialized.activities).toHaveLength(1);
        const serializedActions = serialized.activities[0].actions as ISerializedActionBase[];
        expect(serializedActions).toHaveLength(1);
        expect(serializedActions[0].id).toBe('seize-action-fixed-id');
    });

    it('carries a DelayAction id through serialization', () => {
        const duration = new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(5));
        const delayAction = createDelayAction(duration, null, 'delay-action-fixed-id');
        expect(delayAction.id).toBe('delay-action-fixed-id');

        const modelDef = buildModelWith([delayAction]);
        const serializer = ModelSerializerFactory.create(modelDef);
        const serialized = serializer.serialize(modelDef);

        expect(serialized.activities).toHaveLength(1);
        const serializedActions = serialized.activities[0].actions as ISerializedActionBase[];
        expect(serializedActions).toHaveLength(1);
        expect(serializedActions[0].id).toBe('delay-action-fixed-id');
    });

    it('preserves id across multiple actions on the same activity', () => {
        const duration = new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1));
        const action1 = createDelayAction(duration, null, 'action-id-alpha');
        const action2 = createDelayAction(duration, null, 'action-id-beta');

        const modelDef = buildModelWith([action1, action2]);
        const serializer = ModelSerializerFactory.create(modelDef);
        const serialized = serializer.serialize(modelDef);

        const serializedActions = serialized.activities[0].actions as ISerializedActionBase[];
        expect(serializedActions).toHaveLength(2);
        expect(serializedActions[0].id).toBe('action-id-alpha');
        expect(serializedActions[1].id).toBe('action-id-beta');
    });
});
