// tests/core/referenceSummaries.test.ts
//
// The summary rows both referenceDataBuilder (selection referenceData) and
// projectModelRoot (MODEL_ROOT_SNAPSHOT) send (spec 2026-09-12 §1). Exact
// equality on purpose: a summary that starts leaking whole records (geometry,
// priorities, literal values) fails here, not on the wire.
import {
    summarizeAction,
    summarizeActivity,
    summarizeConnector,
    summarizeGenerator,
    summarizeState,
} from '../../src/core/referenceSummaries';

describe('referenceSummaries', () => {
    it('summarizes actions recursively through BRANCH and LOOP, keeping only summary fields', () => {
        const branch = {
            id: 'b1', type: 'branch', condition: 'noise',
            ifTrue: [{ id: 's1', type: 'seize', resourceRequirementId: 'req-1', priority: 3 }],
            ifFalse: [],
        };
        const loop = { id: 'l1', type: 'loop', actions: [{ id: 'd1', type: 'delay', duration: { value: 5, unit: 'minutes' } }] };

        expect(summarizeAction(branch)).toEqual({
            id: 'b1', type: 'branch',
            ifTrue: [{ id: 's1', type: 'seize', resourceRequirementId: 'req-1' }],
        });
        expect(summarizeAction(loop)).toEqual({
            id: 'l1', type: 'loop',
            actions: [{ id: 'd1', type: 'delay', duration: { value: 5, unit: 'minutes' } }],
        });
    });

    it('keeps a modification expression and drops a literal value', () => {
        const action = {
            id: 'a1', type: 'assign',
            modifications: [{ stateId: 's', operation: 'assign', value: 4 }, { stateId: 't', operation: 'assign', expression: 'x + 1' }],
        };
        expect(summarizeAction(action).modifications).toEqual([
            { stateId: 's', operation: 'assign' },
            { stateId: 't', operation: 'assign', expression: 'x + 1' },
        ]);
    });

    it('summarizes a connector without its geometry', () => {
        const connector = {
            id: 'c1', name: 'To X-ray', sourceId: 'a', targetId: 'b', weight: 2, priority: 1, entityId: 'e',
            condition: { stateId: 's', comparison: 'eq', value: 1 },
            actions: [{ id: 'x', type: 'release', resourceRequirementId: 'r' }],
            levers: [{ leverId: 'l', actionId: 'x' }],
            sourceX: 1, sourceY: 2, targetX: 3, targetY: 4, x: 5, y: 6, path: [[1, 2], [3, 4]],
        };
        expect(summarizeConnector(connector)).toEqual({
            id: 'c1', name: 'To X-ray', sourceId: 'a', targetId: 'b', weight: 2, priority: 1, entityId: 'e',
            condition: { stateId: 's', comparison: 'eq', value: 1 },
            actions: [{ id: 'x', type: 'release', resourceRequirementId: 'r' }],
            levers: [{ leverId: 'l', actionId: 'x' }],
        });
    });

    it('gives a connector with no actions or levers empty lists', () => {
        const summary = summarizeConnector({ id: 'c2', name: 'C', sourceId: 'a', targetId: 'b' });
        expect(summary.actions).toEqual([]);
        expect(summary.levers).toEqual([]);
    });

    it('summarizes a state as its serialized fields, without the class tag', () => {
        const state = {
            id: 'st', name: 'Priority', componentType: 'model', dataType: 'NUMBER', initialValue: 0,
            categoryValues: ['a'], description: 'd', collectStatistics: true, type: 'None',
        };
        expect(summarizeState(state)).toEqual({
            id: 'st', name: 'Priority', componentType: 'model', dataType: 'NUMBER', initialValue: 0,
            categoryValues: ['a'], description: 'd', collectStatistics: true,
        });
    });

    it('summarizes activities and generators exactly as referenceData has always carried them', () => {
        const activity = {
            id: 'a1', name: 'Intake', routing: 'probability', capacity: 3, levers: ['noise'],
            actions: [{ id: 's1', type: 'seize', resourceRequirementId: 'r' }],
            sourceConfig: { entityId: 'e', arrivalPatternId: 'ap', initialStates: [{ stateId: 'st', operation: 'assign', expression: 'y' }] },
            failureProperties: { enabled: true, repairResourceRequirementId: 'r' },
        };
        expect(summarizeActivity(activity)).toEqual({
            id: 'a1', name: 'Intake', routing: 'probability',
            actions: [{ id: 's1', type: 'seize', resourceRequirementId: 'r' }],
            sourceConfig: { initialStates: [{ stateId: 'st', operation: 'assign', expression: 'y' }] },
            failureProperties: { repairResourceRequirementId: 'r' },
        });

        const generator = {
            id: 'g1', name: 'Door', routing: 'probability', mode: 'frequency', entityId: 'e', volume: 9,
            interarrivalTime: { value: 3, unit: 'minutes' },
            initialStates: [{ stateId: 'st', operation: 'assign', value: 1 }],
        };
        expect(summarizeGenerator(generator)).toEqual({
            id: 'g1', name: 'Door', routing: 'probability', mode: 'frequency', entityId: 'e',
            interarrivalTime: { value: 3, unit: 'minutes' },
            initialStates: [{ stateId: 'st', operation: 'assign' }],
        });
    });
});
