// A 402 from SaveAndSubmitSimulation is worded by @quodsi/shared's
// entitlementLimitCopy, the table Studio's EntitlementLimitDialog reads, so
// the same limit says the same thing in every host. Lucid had its own copy,
// keyed partly on `scenarios_per_model`, which the API no longer sends.
import { entitlementLimitMessage } from '@quodsi/lucid-shared';
import { SimulationHandler } from '../../src/core/messaging/handlers/simulationHandler';

const describe402 = (detail: Record<string, unknown>) =>
  (SimulationHandler as any).describeGateError({ status: 402, json: { detail: { code: 'entitlement_exceeded', ...detail } } });

describe('SimulationHandler.describeGateError', () => {
  it('words the monthly run limit as Studio does', () => {
    const detail = { feature: 'simulations_per_month', used: 10, limit: 10 };
    expect(describe402(detail)).toBe(entitlementLimitMessage(detail));
    expect(describe402(detail)).toContain("You've used 10 of 10 simulation runs this month");
  });

  it('a limit with no wording gets the shared generic message', () => {
    expect(describe402({ feature: 'scenarios_per_model', limit: 1 })).toBe(entitlementLimitMessage({ feature: 'scenarios_per_model' }));
  });

  it('other failures still report the HTTP status', () => {
    expect((SimulationHandler as any).describeGateError({ status: 500, json: { detail: 'boom' } }))
      .toBe('Simulation request failed (HTTP 500): boom');
  });
});
