import { reduceModelToCatalog } from './reduceModelToCatalog';

describe('reduceModelToCatalog', () => {
  it('reduces each domain array to id/name and keeps activity actions + generator interarrival', () => {
    const model: any = {
      activities: [{ id: 'a1', name: 'Act', x: 0, y: 0, capacity: 1, inboundQueueCapacity: 0, outboundQueueCapacity: 0,
        actions: [
          { id: 'ac1', actionType: 'SEIZE', resourceRequirementId: 'rr1' },
          { id: 'ac2', actionType: 'DELAY', duration: { durationPeriodUnit: 'MINUTES', distribution: { distributionType: 'CONSTANT', parameters: { value: 5 } } } },
        ], connectors: [] }],
      resources: [{ id: 'r1', name: 'Res', capacity: 1 }],
      resourceRequirements: [{ id: 'rr1', name: 'Req', rootClauses: [] }],
      generators: [{ id: 'g1', name: 'Gen', generationConfig: { entityId: 'e1', generatorType: 'FREQUENCY', periodIntervalDuration: { durationPeriodUnit: 'MINUTES', distribution: { distributionType: 'CONSTANT', parameters: { value: 2 } } } } }],
      connectors: [{ id: 'c1', name: 'Conn', sourceId: 'a1', targetId: 'a1', weight: 1, actions: [] }],
      entities: [{ id: 'e1', name: 'Ent' }],
    };

    const cat = reduceModelToCatalog(model);

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

  it('tolerates missing arrays and missing action/generator sub-fields', () => {
    const cat = reduceModelToCatalog({} as any);
    expect(cat).toEqual({ activities: [], resources: [], resourceRequirements: [], generators: [], connectors: [], entities: [] });
  });
});
