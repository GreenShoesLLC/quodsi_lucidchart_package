import { isNameUniqueInReferenceData } from '../../src/utils/nameValidation';
import { EditorReferenceData } from '../../src/types/EditorReferenceData';
import { SimulationObjectType } from '../../src/types/elements/SimulationObjectType';

describe('isNameUniqueInReferenceData', () => {
    const referenceData: EditorReferenceData = {
        activities: [
            { id: 'act-1', name: 'Triage' },
            { id: 'act-2', name: 'Treatment' },
        ],
        resources: [
            { id: 'res-1', name: 'Nurse' },
        ],
        generators: [
            { id: 'gen-1', name: 'Patient Arrivals' },
        ],
        entities: [
            { id: 'ent-1', name: 'Patient' },
        ],
    };

    it('returns true when name does not exist', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Activity,
            'Registration'
        );
        expect(result).toBe(true);
    });

    it('returns false when name already exists for same type', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Activity,
            'Triage'
        );
        expect(result).toBe(false);
    });

    it('returns true when name exists for different type', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Resource,
            'Triage'
        );
        expect(result).toBe(true);
    });

    it('excludes current element when excludeId provided', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Activity,
            'Triage',
            'act-1'
        );
        expect(result).toBe(true);
    });

    it('still detects conflict when excludeId does not match', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Activity,
            'Triage',
            'act-99'
        );
        expect(result).toBe(false);
    });

    it('handles missing reference data gracefully', () => {
        const emptyData: EditorReferenceData = {};
        const result = isNameUniqueInReferenceData(
            emptyData,
            SimulationObjectType.Activity,
            'Anything'
        );
        expect(result).toBe(true);
    });

    it('handles undefined arrays gracefully', () => {
        const partialData: EditorReferenceData = {
            resources: [{ id: 'res-1', name: 'Nurse' }],
        };
        const result = isNameUniqueInReferenceData(
            partialData,
            SimulationObjectType.Activity,
            'Nurse'
        );
        expect(result).toBe(true);
    });
});
