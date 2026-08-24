// tests/core/modelManager.buildModelRootProjection.test.ts
//
// Final fix wave, item 5a: buildModelRootProjection(page) ignored its `page`
// argument and always read `this.currentPage` (via getModelDefinition() ->
// ensureModelDefinition()), while its sibling updateModelRoot(patch, page)
// already honours the page it's given. Across a page switch, a caller that
// passes a DIFFERENT page than the one ModelManager currently has cached got
// that OTHER page's projection back, silently.
//
// Mirrors modelManager.updateModelRoot.test.ts's harness style:
// Object.create(ModelManager.prototype) + hand-set fields, real prototype
// methods (setCurrentPage, markModelDirty) doing the actual work.

describe('ModelManager.buildModelRootProjection', () => {
  function harness() {
    const changeTracker = {
      modelDefinitionDirty: false,
      validationDirty: false,
      lastModelDefinitionUpdate: 0,
      lastValidationUpdate: 0,
      pendingChanges: new Set<string>(),
    };
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.changeTracker = changeTracker;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.currentPage = { id: 'page-A' };

    // Stub getModelDefinition to return a projection keyed off whichever
    // page is CURRENT at call time -- proves buildModelRootProjection reads
    // the model for the page it was told to switch to, not whatever page
    // was cached before the call.
    const defsByPage: Record<string, any> = {
      'page-A': {
        generators: {
          getAll: () => [
            {
              id: 'gen-a',
              name: 'A',
              levers: [],
              entityId: 'e',
              mode: 'SCHEDULED',
              arrivalScheduleId: 'as-a',
            },
          ],
        },
        arrivalPatterns: { getAll: () => [] },
        arrivalSchedules: { getAll: () => [{ id: 'as-a', name: 'Schedule A', toJSON: () => ({ id: 'as-a', name: 'Schedule A' }) }] },
        entities: { getAll: () => [{ id: 'ent-a', name: 'Patient', description: 'noise' }] },
        states: { getAll: () => [{ id: 'st-a', name: 'Priority', dataType: 'NUMBER' }] },
        // Plan 2b, Task 7: a shape-linked resource (shapeId + shapeLabel
        // stamped the way the builder stamps them), a lane-linked one
        // (laneRef, no shapeId), and an unclaimed one (neither) -- proves
        // the projection carries exactly the link markers each resource
        // actually has, not a fixed shape. financialProperties mimics the
        // real Resource.financialProperties contract (a toJSON()-bearing
        // object), matching Step 2's `fp?.toJSON ? fp.toJSON() : fp`.
        resources: {
          getAll: () => [
            {
              id: 'res-nurse',
              name: 'Nurse',
              capacity: 2,
              description: 'RN staff',
              financialProperties: {
                toJSON: () => ({ enabled: true, costPerSeize: 5, costPerHourUtilized: 40, costPerHourIdle: 0 }),
              },
              levers: [],
              shapeId: 'blk-1',
              shapeLabel: 'Nurse Station',
            },
            {
              id: 'res-doctor',
              name: 'Doctor',
              capacity: 1,
              laneRef: { blockId: 'blk-2', laneId: 'lane-1' },
            },
            {
              id: 'res-tech',
              name: 'Tech',
              capacity: 1,
            },
          ],
        },
        // One custom requirement (references res-nurse) plus one
        // auto-derived requirement (id === resource id, res-tech) -- proves
        // resourceRequirements carries both kinds, serialized via toJSON.
        resourceRequirements: {
          getAll: () => [
            {
              toJSON: () => ({
                id: 'req-custom',
                name: 'Nurse or Doctor',
                rootClause: { id: 'clause-1', mode: 'require_any', requests: [{ resourceId: 'res-nurse' }, { resourceId: 'res-doctor' }], clauses: [] },
              }),
            },
            {
              toJSON: () => ({
                id: 'res-tech',
                name: 'Tech',
                rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'res-tech' }], clauses: [] },
              }),
            },
          ],
        },
        model: {},
      },
      'page-B': {
        generators: { getAll: () => [{ id: 'gen-b', name: 'B', levers: [], entityId: 'e', mode: 'FREQUENCY' }] },
        arrivalPatterns: { getAll: () => [] },
        arrivalSchedules: { getAll: () => [] },
        entities: { getAll: () => [] },
        states: { getAll: () => [] },
        resources: { getAll: () => [] },
        resourceRequirements: { getAll: () => [] },
        model: {},
      },
    };
    mm.getModelDefinition = async () => defsByPage[mm.currentPage.id];

    return { mm, changeTracker };
  }

  it('reads the passed page, not the previously-cached currentPage, when they differ', async () => {
    const { mm } = harness();

    const projection = await mm.buildModelRootProjection({ id: 'page-B' });

    expect(projection.generators).toEqual([
      expect.objectContaining({ id: 'gen-b' }),
    ]);
    expect(mm.currentPage.id).toBe('page-B');
  });

  it('includes arrivalSchedules in the projection, serialized via toJSON', async () => {
    const { mm } = harness();

    const projection = await mm.buildModelRootProjection({ id: 'page-A' });

    expect(projection.arrivalSchedules).toEqual([{ id: 'as-a', name: 'Schedule A' }]);
  });

  // The three fields ScheduleModal reads that this projection did NOT carry
  // until 2026-08-19. Each read on the consuming side is defensive (`?? []`,
  // `?.`), so their absence rendered an empty schedule table and empty
  // Entity/State dropdowns instead of throwing -- and the modal's first edit
  // then minted a duplicate schedule and orphaned the linked one. The
  // consuming half is covered by the REAL ScheduleModal render in
  // quodsim-react/src/features/schedule/__tests__/
  // ScheduleModal.projection.test.tsx; this asserts the producing half still
  // goes through ModelManager.
  it('projects the generator arrivalScheduleId -- SCHEDULED counterpart to arrivalPatternId', async () => {
    const { mm } = harness();

    const projection = await mm.buildModelRootProjection({ id: 'page-A' });

    expect(projection.generators[0]).toHaveProperty('arrivalScheduleId', 'as-a');
  });

  it('projects entities and states as id + name only', async () => {
    const { mm } = harness();

    const projection = await mm.buildModelRootProjection({ id: 'page-A' });

    // Exactly the shape ScheduleTable.tsx:42-43 types its props as -- the
    // extra `description`/`dataType` on the source objects must NOT ride along
    // onto the MODEL_ROOT_SNAPSHOT wire.
    expect(projection.entities).toEqual([{ id: 'ent-a', name: 'Patient' }]);
    expect(projection.states).toEqual([{ id: 'st-a', name: 'Priority' }]);
  });

  // Plan 2b, Task 7: projectModelRoot maps def.resources.getAll() to rows
  // carrying id/name/capacity/description/financialProperties/levers plus
  // the transient shapeId/shapeLabel/laneRef markers -- present ONLY on the
  // resource that actually has them. The consuming half (ResourcesEditor
  // reading these markers for its status column) is covered by the REAL
  // render in quodsim-react/src/features/editors/__tests__/
  // ResourcesTab.projection.test.tsx; this pins the producing half.
  it('projects resources with exactly the link markers each one carries', async () => {
    const { mm } = harness();

    const projection = await mm.buildModelRootProjection({ id: 'page-A' });

    expect(projection.resources).toHaveLength(3);

    const nurse = projection.resources.find((r: any) => r.id === 'res-nurse');
    expect(nurse).toMatchObject({
      id: 'res-nurse',
      name: 'Nurse',
      capacity: 2,
      description: 'RN staff',
      financialProperties: { enabled: true, costPerSeize: 5, costPerHourUtilized: 40, costPerHourIdle: 0 },
      shapeId: 'blk-1',
      shapeLabel: 'Nurse Station',
    });
    expect(nurse.laneRef).toBeUndefined();

    const doctor = projection.resources.find((r: any) => r.id === 'res-doctor');
    expect(doctor).toMatchObject({ id: 'res-doctor', name: 'Doctor', laneRef: { blockId: 'blk-2', laneId: 'lane-1' } });
    expect(doctor.shapeId).toBeUndefined();
    expect(doctor.shapeLabel).toBeUndefined();

    const tech = projection.resources.find((r: any) => r.id === 'res-tech');
    expect(tech).toMatchObject({ id: 'res-tech', name: 'Tech' });
    expect(tech.shapeId).toBeUndefined();
    expect(tech.laneRef).toBeUndefined();
  });

  it('projects resourceRequirements -- the custom requirement plus the derived auto -- serialized via toJSON', async () => {
    const { mm } = harness();

    const projection = await mm.buildModelRootProjection({ id: 'page-A' });

    expect(projection.resourceRequirements).toEqual([
      {
        id: 'req-custom',
        name: 'Nurse or Doctor',
        rootClause: { id: 'clause-1', mode: 'require_any', requests: [{ resourceId: 'res-nurse' }, { resourceId: 'res-doctor' }], clauses: [] },
      },
      {
        id: 'res-tech',
        name: 'Tech',
        rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'res-tech' }], clauses: [] },
      },
    ]);
  });

  it('returns an empty projection -- entities, states, resources and resourceRequirements included -- when the page has no model', async () => {
    const { mm } = harness();
    mm.getModelDefinition = async () => null;

    const projection = await mm.buildModelRootProjection({ id: 'page-A' });

    expect(projection).toEqual({
      generators: [],
      arrivalPatterns: [],
      arrivalSchedules: [],
      entities: [],
      states: [],
      resources: [],
      resourceRequirements: [],
      model: {},
    });
  });

  it('does not force a cache-dirty rebuild when the passed page matches currentPage', async () => {
    const { mm, changeTracker } = harness();

    await mm.buildModelRootProjection({ id: 'page-A' });

    expect(changeTracker.modelDefinitionDirty).toBe(false);
  });

  it('marks the cache dirty (via setCurrentPage) when switching to a different page', async () => {
    const { mm, changeTracker } = harness();

    await mm.buildModelRootProjection({ id: 'page-B' });

    expect(changeTracker.modelDefinitionDirty).toBe(true);
  });
});
