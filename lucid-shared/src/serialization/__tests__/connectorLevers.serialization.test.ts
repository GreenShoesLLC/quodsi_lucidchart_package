import { ModelDefinitionSerializerV1 } from '../v1/ModelDefinitionSerializerV1';
import { createScenarioLever, ScenarioPropertyName } from '@quodsi/shared';

// No full-ModelDefinition serializer test exists in lucid-shared, so (mirroring
// actionName.serialization.test.ts) we instantiate the concrete V1 serializer and
// reach the protected serializeConnector via an `as any` cast. A minimal
// Connector-shaped object satisfies serializeConnector, which only requires
// id + sourceId + an effective destination (targetId) plus the actions /
// stateModifications arrays.
function makeSerializer(): any {
    return new ModelDefinitionSerializerV1() as any;
}

function makeConnector(overrides: Record<string, unknown> = {}): any {
    return {
        id: 'c1',
        name: 'Route',
        sourceId: 'src1',
        targetId: 'tgt1',
        sourceX: 0,
        sourceY: 0,
        targetX: 1,
        targetY: 1,
        x: 0.5,
        y: 0.5,
        weight: 1,
        actions: [],
        stateModifications: [],
        getEffectiveDestinationUniqueId() {
            return (this as any).destinationUniqueId ?? (this as any).targetId;
        },
        ...overrides,
    };
}

describe('serializeConnector carries Connector scenario levers', () => {
    it('serializes a CONNECTOR/WEIGHT lever into the serialized connector', () => {
        const serializer = makeSerializer();
        const lever = createScenarioLever({
            propertyName: ScenarioPropertyName.WEIGHT,
            label: 'Branch split',
        });
        const connector = makeConnector({ levers: [lever] });

        const out = serializer.serializeConnector(connector);

        expect(out.levers).toBeDefined();
        expect(out.levers).toHaveLength(1);
        expect(out.levers[0].propertyName).toBe(ScenarioPropertyName.WEIGHT);
        expect(out.levers[0].label).toBe('Branch split');
    });

    it('omits levers when the connector declares none (conditional inclusion)', () => {
        const serializer = makeSerializer();
        const connector = makeConnector();

        const out = serializer.serializeConnector(connector);

        expect(out.levers).toBeUndefined();
        expect('levers' in out).toBe(false);
    });
});
