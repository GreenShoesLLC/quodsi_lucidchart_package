import { ModelDefinition } from '@quodsi/shared';
import { Model } from '@quodsi/lucid-shared';
import { Activity } from '@quodsi/shared';
import { Resource } from '@quodsi/shared';
import { SimulationObjectType } from '@quodsi/shared';

describe('ModelDefinition', () => {
    let modelDef: ModelDefinition;

    beforeEach(() => {
        const model = Model.createDefault('test-model');
        modelDef = new ModelDefinition(model);
    });

    describe('isNameUniqueForType', () => {
        it('returns true when no objects exist for the type', () => {
            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Triage'
            );
            expect(result).toBe(true);
        });

        it('returns true when name does not conflict', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Registration'
            );
            expect(result).toBe(true);
        });

        it('returns false when name conflicts with existing object', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Triage'
            );
            expect(result).toBe(false);
        });

        it('returns true when name exists for different type', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Resource,
                'Triage'
            );
            expect(result).toBe(true);
        });

        it('excludes specified ID from conflict check', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Triage',
                'act-1'
            );
            expect(result).toBe(true);
        });

        it('still detects conflict when excludeId does not match', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Triage',
                'act-99'
            );
            expect(result).toBe(false);
        });
    });

    describe('getUsedNamesForType', () => {
        it('returns empty array when no objects exist', () => {
            const result = modelDef.getUsedNamesForType(SimulationObjectType.Activity);
            expect(result).toEqual([]);
        });

        it('returns all names for the given type', () => {
            const act1 = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            const act2 = new Activity('act-2', 'Treatment', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(act1);
            modelDef.activities.add(act2);

            const result = modelDef.getUsedNamesForType(SimulationObjectType.Activity);
            expect(result).toContain('Triage');
            expect(result).toContain('Treatment');
            expect(result).toHaveLength(2);
        });

        it('does not include names from other types', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            const resource = new Resource('res-1', 'Nurse', 1);
            modelDef.activities.add(activity);
            modelDef.resources.add(resource);

            const activityNames = modelDef.getUsedNamesForType(SimulationObjectType.Activity);
            expect(activityNames).toContain('Triage');
            expect(activityNames).not.toContain('Nurse');
        });
    });
});
