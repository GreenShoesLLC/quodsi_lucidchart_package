// Guards the exact hop that was missed once already on this feature: Lucid's
// quodsim-react consumes @quodsi/lucid-shared, not @quodsi/shared directly, so
// findExpressionsReferencingState has to be re-exported here or the delete
// dialog's import silently has nothing to bind to.
import { findExpressionsReferencingState, type ExpressionStateReference } from '../index';

it('re-exports findExpressionsReferencingState from @quodsi/shared', () => {
  const scope = {
    activities: [
      {
        id: 'activity_1',
        actions: [
          {
            id: 'action_1',
            modifications: [
              { stateId: 'total', operation: 'assign', expression: 'qty * unit_price' },
            ],
          },
        ],
      },
    ],
  };

  const hits: ExpressionStateReference[] = findExpressionsReferencingState(scope, 'unit_price');

  expect(hits).toEqual([
    { elementId: 'activity_1', stateId: 'total', expression: 'qty * unit_price' },
  ]);
});
