import { StorageAdapter } from '../../src/core/StorageAdapter';
import { makeFakePage } from '../helpers/fakeProxies';

describe('StorageAdapter q_resources / q_lucid_format', () => {
    it('round-trips the resources list through page shapeData', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        sa.setResources(page, [{ id: 'r1', name: 'Nurse', capacity: 2 }]);
        expect(JSON.parse(page.shapeData.get('q_resources'))).toEqual([{ id: 'r1', name: 'Nurse', capacity: 2 }]);
        expect(sa.getResources(page)).toEqual([{ id: 'r1', name: 'Nurse', capacity: 2 }]);
    });

    it('returns [] when the key is absent or corrupt', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        expect(sa.getResources(page)).toEqual([]);
        page.shapeData.set('q_resources', '{not json');
        expect(sa.getResources(page)).toEqual([]);
    });

    it('clearResources deletes the key', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        sa.setResources(page, [{ id: 'r1', name: 'Nurse' }]);
        sa.clearResources(page);
        expect(page.shapeData.get('q_resources')).toBeUndefined();
    });

    it('storage format is an integer string; absent/invalid reads as null', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        expect(sa.getStorageFormat(page)).toBeNull();
        sa.setStorageFormat(page, 2);
        expect(page.shapeData.get('q_lucid_format')).toBe('2');
        expect(sa.getStorageFormat(page)).toBe(2);
        page.shapeData.set('q_lucid_format', 'two');
        expect(sa.getStorageFormat(page)).toBeNull();
    });

    it('clearAllModelData removes both new keys', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        sa.setResources(page, [{ id: 'r1', name: 'Nurse' }]);
        sa.setStorageFormat(page, 2);
        sa.clearAllModelData(page);
        expect(page.shapeData.get('q_resources')).toBeUndefined();
        expect(page.shapeData.get('q_lucid_format')).toBeUndefined();
    });
});
