import { reduceModelToCatalog } from './reduceModelToCatalog';

describe('reduceModelToCatalog', () => {
  it('reduces each domain array to id/name and keeps activity actions + generator interarrival', () => {
    const model: any = {
      activities: [{ id: 'a1', name: 'Act', x: 0, y: 0, capacity: 1,
        actions: [
          { id: 'ac1', type: 'seize', resourceRequirementId: 'rr1' },
          { id: 'ac2', type: 'delay', duration: { value: 5, unit: 'minutes' } },
        ] }],
      connectors: [{ id: 'c1', name: 'Conn', sourceId: 'a1', targetId: 'a1', weight: 1, actions: [] }],
      resources: [{ id: 'r1', name: 'Res', capacity: 1 }],
      resourceRequirements: [{ id: 'rr1', name: 'Req', rootClause: { id: 'clause-1', mode: 'require_all' } }],
      generators: [{ id: 'g1', name: 'Gen', entityId: 'e1', interarrivalTime: { value: 2, unit: 'minutes' } }],
      entities: [{ id: 'e1', name: 'Ent' }],
    };

    const cat = reduceModelToCatalog(model);

    expect(cat.activities).toEqual([{ id: 'a1', name: 'Act', actions: [
      { id: 'ac1', type: 'seize', resourceRequirementId: 'rr1' },
      { id: 'ac2', type: 'delay', duration: { value: 5, unit: 'minutes' } },
    ] }]);
    expect(cat.resources).toEqual([{ id: 'r1', name: 'Res' }]);
    expect(cat.resourceRequirements).toEqual([{ id: 'rr1', name: 'Req' }]);
    expect(cat.generators).toEqual([{ id: 'g1', name: 'Gen', interarrivalTime: { value: 2, unit: 'minutes' } }]);
    expect(cat.connectors).toEqual([{ id: 'c1', name: 'Conn' }]);
    expect(cat.entities).toEqual([{ id: 'e1', name: 'Ent' }]);
  });

  it('tolerates missing arrays and missing action/generator sub-fields', () => {
    const cat = reduceModelToCatalog({} as any);
    expect(cat).toEqual({ activities: [], resources: [], resourceRequirements: [], generators: [], connectors: [], entities: [] });
  });

  it('dedupes top-level connectors by id', () => {
    const model: any = {
      connectors: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }, { id: 'c2', name: 'C2 dup' }],
    };
    expect(reduceModelToCatalog(model).connectors).toEqual([{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }]);
  });
});
