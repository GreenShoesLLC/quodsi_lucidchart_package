// generateUniqueName / ensureUniqueName are now centralized in @quodsi/shared.
// This file verifies the lucid-shared re-export shim and the new numbered-suffix
// behavior (Triage, Triage_2, Triage_3 ...).
import { generateUniqueName, ensureUniqueName } from '../../src/utils/nameUtils';
import { ModelDefinition } from '@quodsi/shared';
import { Model } from '@quodsi/lucid-shared';
import { Activity } from '@quodsi/shared';
import { SimulationObjectType } from '@quodsi/shared';

const takenFrom = (names: string[]) => {
    const set = new Set(names);
    return (candidate: string) => set.has(candidate);
};

describe('generateUniqueName (re-exported from @quodsi/shared)', () => {
    it('returns the base name when free', () => {
        expect(generateUniqueName('Triage', takenFrom([]))).toBe('Triage');
    });

    it('appends _2 for the first collision', () => {
        expect(generateUniqueName('Triage', takenFrom(['Triage']))).toBe('Triage_2');
    });

    it('counts up and skips suffixes already taken', () => {
        expect(generateUniqueName('Triage', takenFrom(['Triage', 'Triage_2']))).toBe('Triage_3');
    });
});

describe('ensureUniqueName (re-exported from @quodsi/shared)', () => {
    let modelDef: ModelDefinition;

    beforeEach(() => {
        const model = Model.createDefault('test-model');
        modelDef = new ModelDefinition(model);
    });

    it('returns original name when unique', () => {
        const result = ensureUniqueName(modelDef, SimulationObjectType.Activity, 'Triage');
        expect(result).toBe('Triage');
    });

    it('returns numbered name when duplicate exists', () => {
        const activity = Activity.createDefault('act-1');
        activity.name = 'Triage';
        modelDef.activities.add(activity);

        const result = ensureUniqueName(modelDef, SimulationObjectType.Activity, 'Triage');
        expect(result).toBe('Triage_2');
    });

    it('allows same name for different types', () => {
        const activity = Activity.createDefault('act-1');
        activity.name = 'Triage';
        modelDef.activities.add(activity);

        const result = ensureUniqueName(modelDef, SimulationObjectType.Resource, 'Triage');
        expect(result).toBe('Triage');
    });
});
