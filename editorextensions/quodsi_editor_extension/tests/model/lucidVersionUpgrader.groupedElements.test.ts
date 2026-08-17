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
// path, not merely a theoretical one. Fixed by switching all four call
// sites (beginUpgrade backup x2, performUpgrade collect x2, rollbackUpgrade
// restore x2) to `allBlocks`/`allLines`.
//
// These fakes model that exact scenario: a block/line present in
// `page.allBlocks`/`page.allLines` (as every real grouped element is) but
// NOT in a shallow `page.blocks`/`page.lines` list (which this test
// deliberately never populates, mirroring the real SDK's behavior for a
// grouped shape).

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

describe('LucidVersionUpgrader upgrades elements inside Lucid Groups', () => {
    it('upgrades a block that only exists in allBlocks (grouped), not a shallow blocks list', async () => {
        const page = makeFakePage('page-1');
        setOldShapeModelBlob(page);

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
        // Deliberately no `page.blocks` at all — matches makeFakePage's own
        // default shape (undefined) and the real SDK's shallow list for a
        // page whose only Activity sits inside a group.

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        // performUpgrade stores the raw upgraded envelope (schemaVersion/
        // type/id/platform/domain), same shape StorageAdapter.getElementData
        // flattens on read — assert against the envelope's `domain` here.
        const upgraded = JSON.parse(groupedActivity.shapeData.get('q_data'));
        expect(upgraded.domain.routing).toBe('probability');
        expect(upgraded.domain.inboundCapacity).toBeUndefined(); // 999999 collapses to absent
        expect(upgraded.domain.outboundCapacity).toBeUndefined();
        expect('connectType' in upgraded.domain).toBe(false);
        expect('inboundQueueCapacity' in upgraded.domain).toBe(false);
    });

    it('upgrades a line that only exists in allLines (grouped), not a shallow lines list', async () => {
        const page = makeFakePage('page-2');
        setOldShapeModelBlob(page);

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

        const upgraded = JSON.parse(groupedConnector.shapeData.get('q_data'));
        expect(upgraded.domain.entityId).toBe('entity-1');
        expect('entityTemplateUniqueId' in upgraded.domain).toBe(false);
    });

    it('backs up and restores a grouped block on a failed upgrade (rollback covers allBlocks too)', async () => {
        const page = makeFakePage('page-3');
        setOldShapeModelBlob(page);

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
