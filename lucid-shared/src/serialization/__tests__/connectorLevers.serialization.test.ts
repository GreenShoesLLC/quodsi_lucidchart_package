import { ModelDefinitionSerializerV1 } from '../v1/ModelDefinitionSerializerV1';
import { Connector, createScenarioLever, ScenarioPropertyName } from '@quodsi/shared';

// Instantiate the concrete V1 serializer and reach the protected
// serializeConnector via an `as any` cast.
//
// Wire-cleanup Phase B2 Task 9: `serializeConnector` now delegates to
// `Connector.toJSON()` — requires a REAL `Connector` instance (not a
// duck-typed plain object literal). The old `getEffectiveDestinationUniqueId()`
// legacy-fallback method is gone; `targetId` is the sole destination field now.
function makeSerializer(): any {
    return new ModelDefinitionSerializerV1() as any;
}

function makeConnector(overrides?: (c: Connector) => void): Connector {
    const connector = Connector.createDefault('c1', 0, 0, 1, 1);
    connector.name = 'Route';
    connector.sourceId = 'src1';
    connector.targetId = 'tgt1';
    overrides?.(connector);
    return connector;
}

describe('serializeConnector carries Connector scenario levers', () => {
    it('serializes a CONNECTOR/WEIGHT lever into the serialized connector', () => {
        const serializer = makeSerializer();
        const lever = createScenarioLever({
            propertyName: ScenarioPropertyName.WEIGHT,
            label: 'Branch split',
        });
        const connector = makeConnector((c) => { c.levers = [lever]; });

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
