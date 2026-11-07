// Final-review fix (D2): the too-new guard is ONE pure function
// (storageFormat.pageTooNewError) and every write path consults it --
// ModelManager, the page conversion service (Diagram Mapping Apply and
// convertPage) and the paste normalizer. A too-new page gets no writes.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import {
    pageTooNewError,
    StorageFormatTooNewError,
    ModelSchemaTooNewError,
    EXTENSION_UPDATE_ADVICE,
    LUCID_STORAGE_FORMAT,
} from '../../src/core/storageFormat';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { SimulationObjectType, MODEL_SCHEMA_VERSION } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

function pageWith(sa: StorageAdapter, opts: { version?: string; rawQData?: string; format?: number } = {}): any {
    const page = makeFakePage('page-1');
    if (opts.rawQData !== undefined) {
        page.shapeData.set('q_data', opts.rawQData);
    } else {
        sa.setElementData(page, { id: 'model-1', name: 'M' } as any, SimulationObjectType.Model,
            opts.version === undefined ? undefined : ({ version: opts.version } as any));
    }
    if (opts.format !== undefined) sa.setStorageFormat(page, opts.format);
    return page;
}

/** Spy every shapeData write on the page and its blocks. */
function spyWrites(...targets: any[]): jest.SpyInstance[] {
    return targets.flatMap(t => [jest.spyOn(t.shapeData, 'set'), jest.spyOn(t.shapeData, 'delete')]);
}
const writeCount = (spies: jest.SpyInstance[]) => spies.reduce((n, s) => n + s.mock.calls.length, 0);

describe('pageTooNewError (pure)', () => {
    const sa = new StorageAdapter();
    it('newer model version -> ModelSchemaTooNewError', () => {
        expect(pageTooNewError(sa, pageWith(sa, { version: '9999.01.01' }))).toBeInstanceOf(ModelSchemaTooNewError);
    });
    it.each([['equal', MODEL_SCHEMA_VERSION], ['older', '2026.08.20']])('%s version is not too new', (_n, v) => {
        expect(pageTooNewError(sa, pageWith(sa, { version: v }))).toBeNull();
    });
    it('absent version is not too new', () => {
        expect(pageTooNewError(sa, pageWith(sa))).toBeNull();
    });
    it('garbage version is not too new', () => {
        expect(pageTooNewError(sa, pageWith(sa, { version: 'banana' }))).toBeNull();
        expect(pageTooNewError(sa, pageWith(sa, { rawQData: '{not json' }))).toBeNull();
    });
    it('format + 1 -> StorageFormatTooNewError; current format is fine', () => {
        expect(pageTooNewError(sa, pageWith(sa, { format: LUCID_STORAGE_FORMAT + 1 }))).toBeInstanceOf(StorageFormatTooNewError);
        expect(pageTooNewError(sa, pageWith(sa, { format: LUCID_STORAGE_FORMAT }))).toBeNull();
    });
});

describe('page conversion on a too-new page', () => {
    afterEach(() => jest.restoreAllMocks());

    function setup() {
        const sa = new StorageAdapter();
        const page = pageWith(sa, { version: '9999.01.01' });
        const block = addBlock(page, makeFakeBlock('b1'));
        const modelManager: any = { initializeModel: jest.fn(), removeModelFromPage: jest.fn() };
        const factory: any = { createPlatformObject: jest.fn() };
        const service = new LucidPageConversionService(modelManager, factory, sa);
        const spies = spyWrites(page, block);
        return { page, modelManager, factory, service, spies };
    }

    it('convertPageWithMappings throws the too-new error and writes nothing', async () => {
        const { page, modelManager, factory, service, spies } = setup();
        const rejection = service.convertPageWithMappings(page, new Map([['b1', SimulationObjectType.Activity]]));
        await expect(rejection).rejects.toBeInstanceOf(ModelSchemaTooNewError);
        await expect(rejection).rejects.toThrow(EXTENSION_UPDATE_ADVICE);
        expect(writeCount(spies)).toBe(0);
        expect(modelManager.removeModelFromPage).not.toHaveBeenCalled();
        expect(modelManager.initializeModel).not.toHaveBeenCalled();
        expect(factory.createPlatformObject).not.toHaveBeenCalled();
    });

    it('convertPage throws the too-new error (not "Failed to initialize") and writes nothing', async () => {
        const { page, modelManager, factory, service, spies } = setup();
        const rejection = service.convertPage(page);
        await expect(rejection).rejects.toBeInstanceOf(ModelSchemaTooNewError);
        await expect(rejection).rejects.toThrow(EXTENSION_UPDATE_ADVICE);
        expect(writeCount(spies)).toBe(0);
        expect(modelManager.removeModelFromPage).not.toHaveBeenCalled();
        expect(modelManager.initializeModel).not.toHaveBeenCalled();
        expect(factory.createPlatformObject).not.toHaveBeenCalled();
    });
});

describe('paste normalization and the too-new guard', () => {
    afterEach(() => jest.restoreAllMocks());

    function pastedBlock(sa: StorageAdapter, newId: string, originalId: string): any {
        const throwaway = makeFakeBlock(originalId);
        sa.setElementData(throwaway, { id: originalId, name: 'Original' } as any, SimulationObjectType.Activity, {});
        const block = makeFakeBlock(newId);
        block.shapeData.set('q_data', throwaway.shapeData.get('q_data')!);
        return block;
    }

    it('writes nothing on a too-new page', () => {
        const sa = new StorageAdapter();
        const page = pageWith(sa, { format: LUCID_STORAGE_FORMAT + 1 });
        const block = addBlock(page, pastedBlock(sa, 'new-id', 'old-id'));
        const spies = spyWrites(page, block);
        const result = normalizePastedItems([block], sa);
        expect(writeCount(spies)).toBe(0);
        expect(result.changed).toBe(false);
    });

    it('control: a current page is still normalized', () => {
        const sa = new StorageAdapter();
        const page = pageWith(sa, { format: LUCID_STORAGE_FORMAT, version: MODEL_SCHEMA_VERSION });
        const block = addBlock(page, pastedBlock(sa, 'new-id', 'old-id'));
        const spies = spyWrites(page, block);
        const result = normalizePastedItems([block], sa);
        expect(result.changed).toBe(true);
        expect(writeCount(spies)).toBeGreaterThan(0);
    });
});
