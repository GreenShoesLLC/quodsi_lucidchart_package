"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var reduceModelToCatalog_1 = require("./reduceModelToCatalog");
describe('reduceModelToCatalog', function () {
    it('reduces each domain array to id/name and keeps activity actions + generator interarrival', function () {
        var model = {
            activities: [{ id: 'a1', name: 'Act', x: 0, y: 0, capacity: 1, inboundQueueCapacity: 0, outboundQueueCapacity: 0,
                    actions: [
                        { id: 'ac1', actionType: 'SEIZE', resourceRequirementId: 'rr1' },
                        { id: 'ac2', actionType: 'DELAY', duration: { durationPeriodUnit: 'MINUTES', distribution: { distributionType: 'CONSTANT', parameters: { value: 5 } } } },
                    ],
                    connectors: [{ id: 'c1', name: 'Conn', sourceId: 'a1', targetId: 'a1', weight: 1, actions: [] }] }],
            resources: [{ id: 'r1', name: 'Res', capacity: 1 }],
            resourceRequirements: [{ id: 'rr1', name: 'Req', rootClauses: [] }],
            generators: [{ id: 'g1', name: 'Gen', generationConfig: { entityId: 'e1', generatorType: 'FREQUENCY', periodIntervalDuration: { durationPeriodUnit: 'MINUTES', distribution: { distributionType: 'CONSTANT', parameters: { value: 2 } } } } }],
            entities: [{ id: 'e1', name: 'Ent' }],
        };
        var cat = (0, reduceModelToCatalog_1.reduceModelToCatalog)(model);
        expect(cat.activities).toEqual([{ id: 'a1', name: 'Act', actions: [
                    { id: 'ac1', actionType: 'SEIZE', resourceRequirementId: 'rr1' },
                    { id: 'ac2', actionType: 'DELAY', duration: { durationPeriodUnit: 'MINUTES', distribution: { distributionType: 'CONSTANT', parameters: { value: 5 } } } },
                ] }]);
        expect(cat.resources).toEqual([{ id: 'r1', name: 'Res' }]);
        expect(cat.resourceRequirements).toEqual([{ id: 'rr1', name: 'Req' }]);
        expect(cat.generators).toEqual([{ id: 'g1', name: 'Gen', generationConfig: { periodIntervalDuration: { durationPeriodUnit: 'MINUTES', distribution: { distributionType: 'CONSTANT', parameters: { value: 2 } } } } }]);
        expect(cat.connectors).toEqual([{ id: 'c1', name: 'Conn' }]);
        expect(cat.entities).toEqual([{ id: 'e1', name: 'Ent' }]);
    });
    it('tolerates missing arrays and missing action/generator sub-fields', function () {
        var cat = (0, reduceModelToCatalog_1.reduceModelToCatalog)({});
        expect(cat).toEqual({ activities: [], resources: [], resourceRequirements: [], generators: [], connectors: [], entities: [] });
    });
    it('flattens + dedupes connectors across activities', function () {
        var model = { activities: [
                { id: 'a1', name: 'A1', actions: [], connectors: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }] },
                { id: 'a2', name: 'A2', actions: [], connectors: [{ id: 'c2', name: 'C2' }] },
            ] };
        expect((0, reduceModelToCatalog_1.reduceModelToCatalog)(model).connectors).toEqual([{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }]);
    });
});
