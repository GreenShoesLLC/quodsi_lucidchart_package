import { ModelDefinitionSerializerV1 } from '../v1/ModelDefinitionSerializerV1';
import { QueueRanking } from '@quodsi/shared';

// Mirrors connectorLevers.serialization.test.ts: instantiate the concrete V1
// serializer and reach the protected serializeActivity via an `as any` cast.
// A minimal Activity-shaped object satisfies serializeActivity (id + name +
// numeric capacities + an actions array it can map).
function makeSerializer(): any {
    return new ModelDefinitionSerializerV1() as any;
}

function makeActivity(overrides: Record<string, unknown> = {}): any {
    return {
        id: 'a1',
        name: 'Triage',
        x: 0,
        y: 0,
        capacity: 1,
        inboundQueueCapacity: 999999,
        outboundQueueCapacity: 999999,
        actions: [],
        ...overrides,
    };
}

describe('serializeActivity carries queueRanking (86e2qd9np)', () => {
    it('serializes a ranked activity — a re-save must not drop the setting', () => {
        const serializer = makeSerializer();
        const queueRanking: QueueRanking = { stateName: 'acuity', order: 'ASCENDING' };
        const activity = makeActivity({ queueRanking });

        const out = serializer.serializeActivity(activity);

        expect(out.queueRanking).toBeDefined();
        expect(out.queueRanking.stateName).toBe('acuity');
        expect(out.queueRanking.order).toBe('ASCENDING');
    });

    it('omits queueRanking when absent (conditional inclusion — unranked models stay byte-identical)', () => {
        const serializer = makeSerializer();
        const activity = makeActivity();

        const out = serializer.serializeActivity(activity);

        expect(out.queueRanking).toBeUndefined();
        expect('queueRanking' in out).toBe(false);
    });
});
