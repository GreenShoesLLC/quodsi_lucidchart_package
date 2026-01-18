import { generateUniqueName } from '../../src/utils/nameUtils';

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
