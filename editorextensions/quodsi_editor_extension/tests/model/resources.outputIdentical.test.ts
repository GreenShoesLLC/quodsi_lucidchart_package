// The output-identical pin for the Part 2 storage relocation (spec §Testing,
// pin 1). Captured BEFORE the relocation from today's builder; after it, the
// same legacy fixture runs migrate -> build and must serialize identically,
// geometry excepted. Ids, names, capacities, financials, requirement
// structure and every reference must all survive.
import * as fs from 'fs';
import * as path from 'path';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { ModelSerializerFactory } from '@quodsi/lucid-shared';
import { buildLegacyResourcesPage, IDS } from '../fixtures/legacyResourcesPage';

const GOLDEN = path.join(__dirname, '..', 'fixtures', 'legacyResourcesPage.golden.json');

function upgradeAndBuild(page: any) {
    const sa = new StorageAdapter();
    // Task 3 inserts the migration here: migrateResourcesToModelLevel(page, sa)
    const builder = new ModelDefinitionPageBuilder(sa, new LucidElementFactory(sa));
    const def = builder.buildFromConvertedPage(page);
    if (!def) throw new Error('build returned null');
    return def;
}

/**
 * Engine-facing JSON, produced by the SAME serializer the extension calls
 * before submission (ModelSerializerFactory.create(def).serialize(def) --
 * see simulationHandler.ts / simulationRunHandler.ts), with resource
 * geometry removed (lanes were 0/0, now unpositioned) and the serializer's
 * own wall-clock stamp (`metadata.timestamp`, BaseModelDefinitionSerializer.
 * getMetadata()) normalized -- it is `new Date().toISOString()` at
 * serialize time, not a property of the model, so it differs on every run
 * and would never let this golden compare equal twice.
 */
function comparable(def: any) {
    const serializer = ModelSerializerFactory.create(def);
    const serialized = serializer.serialize(def);
    const json = JSON.parse(JSON.stringify(serialized));
    const sortById = (xs: any[]) => [...xs].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    json.resources = sortById(json.resources ?? []).map(({ x, y, width, height, ...rest }: any) => rest);
    json.resourceRequirements = sortById(json.resourceRequirements ?? []);
    if (json.metadata) json.metadata.timestamp = 'NORMALIZED';
    return json;
}

describe('resources: legacy page serializes identically after relocation', () => {
    it('matches the committed golden (apart from resource geometry)', () => {
        const page = buildLegacyResourcesPage(new StorageAdapter());
        const actual = comparable(upgradeAndBuild(page));
        if (!fs.existsSync(GOLDEN)) {
            fs.writeFileSync(GOLDEN, JSON.stringify(actual, null, 2));
            throw new Error(`Golden written to ${GOLDEN}; re-run to compare`);
        }
        const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
        expect(actual).toEqual(golden);
    });

    it('golden sanity: every reference resolves inside the golden itself', () => {
        const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
        const resourceIds = new Set(golden.resources.map((r: any) => r.id));
        const reqIds = new Set(golden.resourceRequirements.map((r: any) => r.id));
        expect(resourceIds).toEqual(new Set([IDS.nurseBlock, IDS.laneDoctorResource, IDS.laneTechResource]));
        // three autos + one custom
        expect(reqIds).toEqual(new Set([IDS.nurseBlock, IDS.laneDoctorResource, IDS.laneTechResource, IDS.customReq]));
        const custom = golden.resourceRequirements.find((r: any) => r.id === IDS.customReq);
        for (const req of custom.rootClause.requests) expect(resourceIds.has(req.resourceId)).toBe(true);
        const triage = golden.activities.find((a: any) => a.id === IDS.triage);
        expect(triage.actions.filter((a: any) => a.resourceRequirementId === IDS.customReq)).toHaveLength(2);
        expect(triage.failureProperties.repairResourceRequirementId).toBe(IDS.nurseBlock);
    });
});
