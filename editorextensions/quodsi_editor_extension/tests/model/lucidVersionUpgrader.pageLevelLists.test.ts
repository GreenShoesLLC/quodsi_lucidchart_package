// tests/model/lucidVersionUpgrader.pageLevelLists.test.ts
//
// Review R3 (HIGH) on wire-cleanup Phase B2 Task 9: `LucidVersionUpgrader.
// performUpgrade` only ever collected elements carrying `q_data` (page +
// blocks + lines) — the page-level `q_res_requirements` and `q_states`
// lists were NEVER fed through `upgradeElements` at all. Consequences:
//   - an existing document's custom requirements kept `rootClauses[]`/
//     `clauseId`/`subClauses` forever, and
//     `ModelDefinitionPageBuilder.deserializeClause(undefined)` THREW on
//     load once the page builder started reading the clean
//     `rootClause`/`id`/`clauses` names (wire-cleanup Phase B2 Task 9).
//   - stored states kept their old UPPERCASE enum values
//     (`componentType`/`dataType`), which then flowed un-mapped onto the
//     2026.11.01 wire.
//
// Fixed by routing both page-level lists through the SAME `upgradeElements`
// call as every other element (registry keys 'ResourceRequirement'/'State'
// exist — B1 Task 7 registered them) and writing the upgraded lists back.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { LucidVersionUpgrader } from '../../src/versioning/LucidVersionUpgrader';
import { ModelDefinition, Model, SimulationTimeType, PeriodUnit } from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

function makeUpgradePage(id: string): any {
    const page = makeFakePage(id);
    page.blocks = new Map();
    page.lines = new Map();
    page.getTitle = () => 'Test Page';
    return page;
}

/** An old-era Model page blob, stamped at the pre-clean version so the
 *  upgrader's sourceVersion resolves to it (LucidPreflightChecker.
 *  getPageVersion reads `q_data.version`). */
function setOldShapeModelBlob(page: any): void {
    page.shapeData.set('q_data', JSON.stringify({
        type: 'Model',
        id: page.id,
        version: '2026.10.11',
        name: 'M',
        reps: 1,
        oneClockUnit: 'MINUTES',
        simulationTimeType: 'Clock',
        runClockPeriod: 24,
        runClockPeriodUnit: 'HOURS',
    }));
}

describe('LucidVersionUpgrader page-level lists (review R3)', () => {
    it('upgrades a stored resource requirement (rootClauses[]/clauseId/subClauses -> rootClause/id/clauses)', async () => {
        const page = makeUpgradePage('page-1');
        setOldShapeModelBlob(page);

        const oldRequirement = {
            id: 'rr-1',
            name: 'RR1',
            rootClauses: [
                {
                    clauseId: 'clause-1',
                    mode: 'REQUIRE_ALL',
                    requests: [{ resourceId: 'r1', quantity: 1, priority: 1, keepResource: false }],
                    subClauses: [],
                },
            ],
        };
        page.shapeData.set('q_res_requirements', JSON.stringify([oldRequirement]));

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        const stored = JSON.parse(page.shapeData.get('q_res_requirements'));
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe('rr-1');
        expect(stored[0].name).toBe('RR1');
        expect(stored[0].rootClause).toEqual({
            id: 'clause-1',
            mode: 'require_all',
            requests: [{ resourceId: 'r1', quantity: 1, priority: 1, keepResource: false }],
        });
        expect('rootClauses' in stored[0]).toBe(false);

        // The page builder must load the upgraded shape without throwing —
        // that's the real symptom this bug produced (deserializeClause(undefined)).
        const storageAdapter = new StorageAdapter();
        const elementFactory = new LucidElementFactory(storageAdapter);
        const builder = new ModelDefinitionPageBuilder(storageAdapter, elementFactory);
        const model = new Model('page-1', 'M', 1, 12345, PeriodUnit.MINUTES, SimulationTimeType.Clock);
        const modelDefinition = new ModelDefinition(model);

        expect(() => {
            (builder as any).loadAndMergeResourceRequirements(page, modelDefinition);
        }).not.toThrow();

        const loaded = modelDefinition.resourceRequirements.getAll();
        expect(loaded).toHaveLength(1);
        expect(loaded[0].id).toBe('rr-1');
        expect(loaded[0].rootClause.id).toBe('clause-1');
        expect(loaded[0].rootClause.requests).toHaveLength(1);
        expect(loaded[0].rootClause.requests[0].resourceId).toBe('r1');
    });

    it('upgrades a stored state (old UPPERCASE enum values -> clean lowercase values)', async () => {
        const page = makeUpgradePage('page-2');
        setOldShapeModelBlob(page);

        const oldState = {
            id: 'state-1',
            name: 'priority',
            componentType: 'ENTITY',
            dataType: 'NUMBER',
            initialValue: 0,
            collectStatistics: true,
        };
        page.shapeData.set('q_states', JSON.stringify([oldState]));

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        const stored = JSON.parse(page.shapeData.get('q_states'));
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({
            id: 'state-1',
            name: 'priority',
            componentType: 'entity',
            dataType: 'number',
            initialValue: 0,
            collectStatistics: true,
        });
    });

    it('leaves both lists absent when neither is stored (no spurious writes)', async () => {
        const page = makeUpgradePage('page-3');
        setOldShapeModelBlob(page);

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        expect(page.shapeData.get('q_res_requirements')).toBeUndefined();
        expect(page.shapeData.get('q_states')).toBeUndefined();
    });
});
