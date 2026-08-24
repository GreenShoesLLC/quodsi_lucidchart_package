// tests/fixtures/legacyResourcesPage.ts
//
// A storage-format-1 page: one Resource block (record on q_data), one
// swimlane with two lanes owning inline records, one Activity whose Seize
// action references a CUSTOM multi-resource requirement and whose failure
// repair references the block resource's auto-requirement, plus the custom
// requirement itself on q_res_requirements. Built ONLY through
// StorageAdapter's own setters so it is exactly what the shipped extension
// writes -- never hand-built envelopes.
//
// Field names below are ground-truthed against the actual readers (not
// copied blind from a brief example) -- see task-2-report.md for the list
// of names that had to change and why:
//   - Activity queue-capacity fields are `inboundCapacity`/`outboundCapacity`
//     (ActivityLucid's StoredActivityData), not `inputBufferCapacity`/
//     `outputBufferCapacity`.
//   - Action `type` values are the ActionType enum's actual (lowercase)
//     values ('seize'/'delay'/'release'), not upper-case tags -- ActionType
//     is a string enum and hydrateActions/sparsifyAction compare against the
//     real values.
//   - PeriodUnit/SimulationTimeType/RequirementMode values are likewise the
//     real enum values ('minutes', 'clock', 'require_any').
import { StorageAdapter } from '../../src/core/StorageAdapter';
import {
    SimulationObjectType,
    MODEL_SCHEMA_VERSION,
    ActionType,
    PeriodUnit,
    SimulationTimeType,
    RequirementMode,
} from '@quodsi/lucid-shared';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';

export const IDS = {
    page: 'page-legacy',
    nurseBlock: 'blk-nurse',          // resource id === block id (legacy convention)
    swimlane: 'blk-swim',
    laneDoctorResource: 'res-doctor', // lane-owned, id lives in lanes[0].resource.id
    laneTechResource: 'res-tech',
    laneDoctor: 'lane-0',
    laneTech: 'lane-1',
    triage: 'blk-triage',
    customReq: 'req-doctor-or-2-nurses',
} as const;

export function buildLegacyResourcesPage(sa: StorageAdapter) {
    const page = makeFakePage(IDS.page);

    // Page-level Model record with a version stamp (LucidPreflightChecker reads q_data.version).
    sa.setElementData(page, {
        id: IDS.page, name: 'Legacy', reps: 1, seed: 1,
        oneClockUnit: PeriodUnit.MINUTES, simulationTimeType: SimulationTimeType.Clock,
    } as any, SimulationObjectType.Model, { version: MODEL_SCHEMA_VERSION });

    // Resource BLOCK — full record on q_data (format 1).
    const nurse = addBlock(page, makeFakeBlock(IDS.nurseBlock, { box: { x: 400, y: 50, w: 120, h: 60 }, text: 'Nurse' }));
    sa.setElementData(nurse, {
        id: IDS.nurseBlock, name: 'Nurse', capacity: 3, description: 'Floor nurses',
        x: 400, y: 50, width: 120, height: 60,
        financialProperties: { enabled: true, costPerSeize: 0, costPerHourUtilized: 45, costPerHourIdle: 10 },
    } as any, SimulationObjectType.Resource);

    // Swimlane with two lanes owning inline records (format 1).
    const swim = addBlock(page, makeFakeBlock(IDS.swimlane, { className: 'AdvancedSwimLaneBlock', box: { x: 0, y: 0, w: 800, h: 200 }, lanes: ['Doctor', 'Tech'] }));
    swim.shapeData.set('q_swimlane', JSON.stringify({
        lanes: [
            { laneId: IDS.laneDoctor, titleSnapshot: 'Doctor', assignmentMode: 'runtime-derive',
              resource: { id: IDS.laneDoctorResource, name: 'Doctor', capacity: 1, description: '' } },
            { laneId: IDS.laneTech, titleSnapshot: 'Tech', assignmentMode: 'explicit',
              resource: { id: IDS.laneTechResource, name: 'Tech', capacity: 2, description: 'Lab tech',
                          financialProperties: { enabled: true, costPerSeize: 5, costPerHourUtilized: 30, costPerHourIdle: 0 } } },
        ],
        lastSyncedAt: '2026-01-01T00:00:00.000Z',
    }));

    // Activity referencing the custom requirement (Seize) and the Nurse auto-requirement (repair).
    const triage = addBlock(page, makeFakeBlock(IDS.triage, { box: { x: 100, y: 50, w: 120, h: 60 }, text: 'Triage' }));
    sa.setElementData(triage, {
        id: IDS.triage, name: 'Triage', capacity: 1, inboundCapacity: 1, outboundCapacity: 1,
        x: 100, y: 50, width: 120, height: 60,
        actions: [
            { id: 'act-seize', type: ActionType.SEIZE, resourceRequirementId: IDS.customReq },
            { id: 'act-delay', type: ActionType.DELAY, duration: { value: 5, unit: PeriodUnit.MINUTES } },
            { id: 'act-release', type: ActionType.RELEASE, resourceRequirementId: IDS.customReq },
        ],
        failureProperties: { enabled: true, repairResourceRequirementId: IDS.nurseBlock },
    } as any, SimulationObjectType.Activity);

    // Custom requirement: 1 Doctor OR 2 Nurses.
    sa.setResourceRequirements(page, [{
        id: IDS.customReq, name: 'Doctor or 2 Nurses',
        rootClause: { id: 'c-root', mode: RequirementMode.REQUIRE_ANY, requests: [
            { resourceId: IDS.laneDoctorResource, quantity: 1 },
            { resourceId: IDS.nurseBlock, quantity: 2 },
        ] },
    } as any]);

    return page;
}
