// editorextensions/quodsi_editor_extension/tests/messaging/activityProcessor.swimLaneContainment.test.ts
//
// The swimlane banner on the Activity editor must agree with what the model
// actually does.
//
// `swimLaneContainment` is what makes the panel say "Swimlane Resource ... is
// auto-injected here". The injection itself is SwimLaneResourceInjector's, and
// it skips any lane without a `resourceId` -- an unlinked lane seizes nothing.
// So reporting containment for such a lane would put a claim on screen that
// the serialized model contradicts. The two predicates have to stay identical.
import { ActivityProcessor } from '../../src/core/messaging/handlers/selection/processors/ActivityProcessor';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SwimLaneQuodsiData } from '@quodsi/lucid-shared';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';

const SWIMLANE_DATA_KEY = 'q_swimlane';

/** Runs the private containment detector over one lane mapping. */
function detect(lane: SwimLaneQuodsiData['lanes'][number], records: any[]): any {
  const storage = new StorageAdapter();
  const page = makeFakePage('p1');
  storage.setResources(page, records);

  addBlock(page, makeFakeBlock('sw-1', {
    className: 'AdvancedSwimLaneBlock',
    box: { x: 0, y: 0, w: 400, h: 100 },
    lanes: ['Nurse Lane'],
  }));
  const swimlaneData: SwimLaneQuodsiData = { lanes: [lane], lastSyncedAt: '' };
  page.allBlocks.get('sw-1').shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(swimlaneData));

  // Centered inside lane 0 (the fake lane's box is x/y..w/h of the block).
  const activity = makeFakeBlock('act-1', { box: { x: 10, y: 10, w: 40, h: 40 } });
  const messageData: any = { referenceData: {} };

  (new ActivityProcessor() as any).detectSwimLaneContainment(activity, page, messageData, storage);
  return messageData.referenceData.swimLaneContainment;
}

describe('ActivityProcessor swimlane containment', () => {
  it('reports the linked record name for a lane that points at a resource', () => {
    const containment = detect(
      { laneId: 'l1', titleSnapshot: 'Nurse Lane', assignmentMode: 'runtime-derive', resourceId: 'res-1' },
      [{ id: 'res-1', name: 'Nurse' }]
    );
    expect(containment).toMatchObject({
      swimlaneBlockId: 'sw-1',
      laneIndex: 0,
      laneName: 'Nurse Lane',
      resourceId: 'res-1',
      resourceName: 'Nurse',
    });
  });

  it('reports NOTHING for a mapped-but-unlinked lane, matching the injector', () => {
    const containment = detect(
      { laneId: 'l1', titleSnapshot: 'Nurse Lane', assignmentMode: 'runtime-derive' },
      []
    );
    expect(containment).toBeUndefined();
  });
});
