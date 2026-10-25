// Convert overlays a parked Model record (q_pending_model) onto the model it
// creates. Its key list had no `levers` (and no warmup/finish dates), so a
// parked record's model-level levers were lost on Convert.
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';

const lever = { path: 'model.replications', op: 'set' };

function overlay(pending: Record<string, unknown>) {
  const model: Record<string, unknown> = { name: 'Page 1' };
  const self = { storageAdapter: { takePendingModel: () => pending } };
  (LucidPageConversionService.prototype as any).applyPendingModel.call(self, {} as any, model);
  return model;
}

describe('Convert applies a parked Model record', () => {
  it('carries the levers over', () => {
    expect(overlay({ name: 'Clinic', levers: [lever] })).toMatchObject({ name: 'Clinic', levers: [lever] });
  });

  it('turns every stored date back into a Date', () => {
    const model = overlay({
      startDateTime: '2026-01-05T08:00:00.000Z',
      finishDateTime: '2026-01-09T17:00:00.000Z',
      warmupDateTime: '2026-01-05T09:00:00.000Z',
    });
    for (const key of ['startDateTime', 'finishDateTime', 'warmupDateTime']) {
      expect(model[key]).toBeInstanceOf(Date);
    }
    expect((model.finishDateTime as Date).toISOString()).toBe('2026-01-09T17:00:00.000Z');
  });

  it('skips a bad date rather than storing Invalid Date', () => {
    expect(overlay({ startDateTime: 'not a date' })).not.toHaveProperty('startDateTime');
  });
});
