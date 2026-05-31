import { ActivityTransforms } from '../../../src/versioning/transformations/ActivityTransforms';
import { getTransformationsBetweenVersions } from '../../../src/versioning/transformations';
import { QUODSI_VERSION } from '../../../src/constants/version';

// Locate the action-id backfill hop by its version bounds
function actionIdHop() {
  return ActivityTransforms.transformations.find(
    t => t.sourceVersion === '2026.05.26' && t.targetVersion === '2026.05.31'
  )!;
}

describe('ActivityTransforms action-id backfill hop', () => {
  it('exists with the expected version bounds', () => {
    expect(actionIdHop()).toBeTruthy();
  });

  it('assigns ids to id-less actions and preserves existing ids', () => {
    const out = actionIdHop().transform({
      name: 'A', actions: [
        { actionType: 'SEIZE', resourceRequirementId: 'rr1' },          // no id
        { id: 'keep', actionType: 'DELAY' },
      ],
    });
    expect(typeof out.actions[0].id).toBe('string');
    expect(out.actions[0].id.length).toBeGreaterThan(0);
    expect(out.actions[1].id).toBe('keep');
  });

  it('is an identity for activities with no actions', () => {
    expect(actionIdHop().transform({ name: 'A' })).toEqual({ name: 'A' });
    expect(actionIdHop().transform({ name: 'A', actions: [] }).actions).toEqual([]);
  });

  it('is selected when upgrading any model at the prior version', () => {
    const sets = getTransformationsBetweenVersions('2026.05.26', QUODSI_VERSION);
    const activity = sets.find(s => s.objectType === 'Activity');
    expect(activity).toBeTruthy();
    expect(activity!.transformations.some(
      t => t.sourceVersion === '2026.05.26' && t.targetVersion === '2026.05.31'
    )).toBe(true);
  });
});
