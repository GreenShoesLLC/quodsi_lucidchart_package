import { generateUniqueName, ensureUniqueName } from '../../src/utils/nameUtils';
import { ModelDefinition } from '@quodsi/shared';
import { Model } from '../../src/types/elements/Model';
import { Activity } from '@quodsi/shared';
import { SimulationObjectType } from '@quodsi/shared';

describe('generateUniqueName', () => {
    it('appends truncated element ID as suffix', () => {
        const result = generateUniqueName('Triage', 'block-abc123xyz789');
        expect(result).toBe('Triage_xyz789');
    });

    it('uses default suffix length of 6', () => {
        const result = generateUniqueName('Test', '123456789012');
        expect(result).toBe('Test_789012');
    });

    it('respects custom suffix length', () => {
        const result = generateUniqueName('Test', 'abcdefghij', 4);
        expect(result).toBe('Test_ghij');
    });

    it('handles short element IDs', () => {
        const result = generateUniqueName('Test', 'abc');
        expect(result).toBe('Test_abc');
    });

    it('handles empty base name', () => {
        const result = generateUniqueName('', 'element123');
        expect(result).toBe('_ent123');
    });
});

describe('ensureUniqueName', () => {
    let modelDef: ModelDefinition;

    beforeEach(() => {
        const model = Model.createDefault('test-model');
        modelDef = new ModelDefinition(model);
    });

    it('returns original name when unique', () => {
        const result = ensureUniqueName(
            modelDef,
            SimulationObjectType.Activity,
            'Triage',
            'element-123'
        );
        expect(result).toBe('Triage');
    });

    it('returns suffixed name when duplicate exists', () => {
        const activity = Activity.createDefault('act-1');
        activity.name = 'Triage';
        modelDef.activities.add(activity);

        const result = ensureUniqueName(
            modelDef,
            SimulationObjectType.Activity,
            'Triage',
            'element-abc123'
        );
        expect(result).toBe('Triage_abc123');
    });

    it('allows same name for different types', () => {
        const activity = Activity.createDefault('act-1');
        activity.name = 'Triage';
        modelDef.activities.add(activity);

        const result = ensureUniqueName(
            modelDef,
            SimulationObjectType.Resource,
            'Triage',
            'element-xyz789'
        );
        expect(result).toBe('Triage');
    });
});
