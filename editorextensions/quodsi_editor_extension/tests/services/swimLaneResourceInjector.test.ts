// editorextensions/quodsi_editor_extension/tests/services/swimLaneResourceInjector.test.ts
//
// What a runtime-derive lane injects into the SERIALIZED model on its way to
// the engine.
//
// A lane's `resourceId` doubles as the id of the auto-requirement the builder
// derives for that resource (reconcileAutoRequirements stamps
// `id === resource.id`). Deleting the resource from the Resources tab does NOT
// rewrite q_swimlane -- the cascade leaves the lane's pointer DANGLING, and the
// builder reports it as `resource_link_dangling`. So the pointer alone is not
// proof the requirement exists, and injecting on it would ship a Seize against
// a requirement id the engine cannot resolve.
import { SwimLaneResourceInjector } from '../../src/services/SwimLaneResourceInjector';
import { ActionType, ISerializedModel, SwimLaneQuodsiData } from '@quodsi/lucid-shared';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';

const SWIMLANE_DATA_KEY = 'q_swimlane';

/**
 * One swimlane with a single runtime-derive lane pointing at `resourceId`,
 * one Activity centered inside that lane, and a serialized model whose
 * requirement list is exactly `requirementIds`.
 */
function runInject(resourceId: string, requirementIds: string[]): ISerializedModel {
  const page = makeFakePage('p1');

  const swimlane = addBlock(page, makeFakeBlock('sw-1', {
    className: 'AdvancedSwimLaneBlock',
    box: { x: 0, y: 0, w: 400, h: 100 },
    lanes: ['Nurse Lane'],
  }));
  const swimlaneData: SwimLaneQuodsiData = {
    lanes: [{ laneId: 'l1', titleSnapshot: 'Nurse Lane', assignmentMode: 'runtime-derive', resourceId }],
    lastSyncedAt: '',
  };
  swimlane.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(swimlaneData));

  addBlock(page, makeFakeBlock('act-1', { box: { x: 10, y: 10, w: 40, h: 40 } }));

  const serializedModel = {
    activities: [{ id: 'act-1', name: 'Triage', actions: [] }],
    resourceRequirements: requirementIds.map((id) => ({ id, name: id, rootClause: { requests: [] } })),
  } as unknown as ISerializedModel;

  return SwimLaneResourceInjector.inject(serializedModel, page as any);
}

describe('SwimLaneResourceInjector', () => {
  it('injects Seize/Release when the lane points at a live requirement', () => {
    const model = runInject('res-1', ['res-1']);

    const actions = model.activities[0].actions!;
    expect(actions).toHaveLength(2);
    expect(actions[0].type).toBe(ActionType.SEIZE);
    expect((actions[0] as any).resourceRequirementId).toBe('res-1');
    expect(actions[1].type).toBe(ActionType.RELEASE);
    expect((actions[1] as any).resourceRequirementId).toBe('res-1');
  });

  it('injects NOTHING for a lane whose resourceId has no requirement (dangling pointer)', () => {
    // The resource was deleted from the Resources tab; q_swimlane still
    // points at it. No requirement means no auto-requirement was derived,
    // so a Seize here would name an id the engine cannot resolve.
    const model = runInject('deleted-res', ['some-other-req']);

    expect(model.activities[0].actions).toEqual([]);
  });
});
