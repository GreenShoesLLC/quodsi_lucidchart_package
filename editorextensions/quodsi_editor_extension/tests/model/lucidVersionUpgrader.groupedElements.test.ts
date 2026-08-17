// tests/model/lucidVersionUpgrader.groupedElements.test.ts
//
// Wire-cleanup Phase B2 Task 10 finding: `LucidVersionUpgrader.performUpgrade`
// (and its `beginUpgrade`/`rollbackUpgrade` backup/restore) collected blocks
// and lines via `page.blocks`/`page.lines` — the SDK's own doc comments
// (lucid-extension-sdk/document/pageproxy.d.ts) are explicit that these are
// "not including ones inside groups". `ModelDefinitionPageBuilder.
// buildFromConvertedPage` (the reader that actually constructs
// ActivityLucid/GeneratorLucid/ConnectorLucid from a page) iterates
// `allBlocks`/`allLines` instead, which DOES include grouped elements.
//
// Net effect before the fix: any Activity/Generator/Resource block (or
// Connector line) a user had ever grouped (Ctrl+G — an ordinary action) was
// silently skipped by the upgrader, but still read by clean-name-only
// readers (post wire-cleanup Phase B2 Task 9) — a reachable silent-data-loss
// path, not merely a theoretical one. Fixed by switching all six call
// sites (beginUpgrade backup x2, performUpgrade collect x2, rollbackUpgrade
// restore x2) to `allBlocks`/`allLines`.
//
// These fakes model that exact scenario precisely: a block/line present in
// `page.allBlocks`/`page.allLines` (as every real grouped element is) AND
// ALSO give the page real, empty `blocks`/`lines` Maps (fix round 1, F2(b))
// — a real grouped shape's page still has a valid (just narrower) shallow
// `blocks`/`lines` collection; it is never `undefined`. Populating it as
// empty means the PRE-FIX code path runs to completion instead of throwing
// a `TypeError` on `page.blocks.values()` — so reverting the fix makes
// these assertions fail on the *semantic* symptom (the grouped element's
// data was never touched by the upgrade) rather than on an unrelated crash
// that would only prove the fix changed which collection is accessed, not
// that skipping it is a real behavioral defect.
//
// Assertions read through `upgraded.domain ?? upgraded` deliberately: a
// still-un-upgraded shape reads back as the ORIGINAL flat blob (no
// `.domain` wrapper), so this pattern lets a reverted fix fail as a clean
// `expect(...).toBe(...)` value mismatch instead of another crash.

import { LucidVersionUpgrader } from '../../src/versioning/LucidVersionUpgrader';
import { makeFakePage, makeFakeBlock, makeFakeLine } from '../helpers/fakeProxies';

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

/** Real domain fields, whether the shape was upgraded (enveloped, `.domain`
 *  present) or not (still the flat original blob). */
function readDomain(raw: string): any {
    const parsed = JSON.parse(raw);
    return parsed.domain ?? parsed;
}

describe('LucidVersionUpgrader upgrades elements inside Lucid Groups', () => {
    it('upgrades a block that only exists in allBlocks (grouped), not the shallow blocks list', async () => {
        const page = makeFakePage('page-1');
        setOldShapeModelBlob(page);
        // A real grouped-shape page still has valid (narrower) shallow
        // collections — never undefined. See file header, F2(b).
        page.blocks = new Map();
        page.lines = new Map();

        const groupedActivity = makeFakeBlock('activity-1');
        groupedActivity.shapeData.set('q_data', JSON.stringify({
            type: 'Activity',
            id: 'activity-1',
            version: '2026.10.11',
            name: 'Triage',
            capacity: 1,
            connectType: 'Probability',
            inboundQueueCapacity: 999999,
            outboundQueueCapacity: 999999,
        }));
        page.allBlocks.set('activity-1', groupedActivity);
        // Deliberately absent from `page.blocks` — the shallow list a real
        // grouped Activity is excluded from.

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        const domain = readDomain(groupedActivity.shapeData.get('q_data'));
        expect(domain.routing).toBe('probability');
        expect(domain.inboundCapacity).toBeUndefined(); // 999999 collapses to absent
        expect(domain.outboundCapacity).toBeUndefined();
        expect('connectType' in domain).toBe(false);
        expect('inboundQueueCapacity' in domain).toBe(false);
    });

    it('upgrades a line that only exists in allLines (grouped), not the shallow lines list', async () => {
        const page = makeFakePage('page-2');
        setOldShapeModelBlob(page);
        page.blocks = new Map();
        page.lines = new Map();

        const groupedConnector = makeFakeLine('connector-1');
        groupedConnector.shapeData.set('q_data', JSON.stringify({
            type: 'Connector',
            id: 'connector-1',
            version: '2026.10.11',
            name: 'A -> B',
            sourceId: 'a',
            targetId: 'b',
            weight: 1,
            entityTemplateUniqueId: 'entity-1',
        }));
        page.allLines.set('connector-1', groupedConnector);

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        const domain = readDomain(groupedConnector.shapeData.get('q_data'));
        expect(domain.entityId).toBe('entity-1');
        expect('entityTemplateUniqueId' in domain).toBe(false);
    });

    it('backs up and restores a grouped block on a failed upgrade (rollback covers allBlocks too)', async () => {
        const page = makeFakePage('page-3');
        setOldShapeModelBlob(page);
        page.blocks = new Map();
        page.lines = new Map();

        const groupedActivity = makeFakeBlock('activity-2');
        const originalBlob = JSON.stringify({
            type: 'Activity',
            id: 'activity-2',
            version: '2026.10.11',
            name: 'Triage',
            capacity: 1,
            connectType: 'Probability',
        });
        groupedActivity.shapeData.set('q_data', originalBlob);
        page.allBlocks.set('activity-2', groupedActivity);

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).beginUpgrade(page);
        // Simulate performUpgrade having mutated the shape before a later
        // step fails.
        groupedActivity.shapeData.set('q_data', JSON.stringify({ type: 'Activity', id: 'activity-2', routing: 'probability' }));

        await (upgrader as any).rollbackUpgrade(page);

        expect(groupedActivity.shapeData.get('q_data')).toBe(originalBlob);
    });
});
