import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/lucid-shared';
import { mapEntitlements } from './entitlements.mapper';

function envelope(data: unknown): EnvelopeBase {
  return {
    id: 'msg-1',
    type: EnvelopeMessageType.ENTITLEMENTS_STATUS,
    source: 'host',
    target: 'broadcast',
    version: '1.0',
    data,
  } as EnvelopeBase;
}

test('mapEntitlements passes through the new fields when present', () => {
  const action = mapEntitlements(
    envelope({
      subjectType: 'organization',
      planKey: 'quodsi_pro',
      planStatus: 'active',
      features: {},
      planSource: 'kinde_org',
      orgName: 'Acme Co',
      studiesUsed: 3,
      studiesPerOrgLimit: 10,
      scenariosPerStudyLimit: 25,
      replicationsPerScenarioLimit: 100,
      tradeoffAnalysis: true,
      chartExport: true,
    })
  );

  expect(action).toMatchObject({
    type: 'ENTITLEMENTS_STATUS_UPDATE',
    planSource: 'kinde_org',
    orgName: 'Acme Co',
    studiesUsed: 3,
    studiesPerOrgLimit: 10,
    scenariosPerStudyLimit: 25,
    replicationsPerScenarioLimit: 100,
    tradeoffAnalysis: true,
    chartExport: true,
  });
});

test('mapEntitlements leaves the new fields undefined when the host omits them (old-host compat)', () => {
  const action = mapEntitlements(
    envelope({
      subjectType: 'organization',
      planKey: 'quodsi_free',
      planStatus: 'active',
      features: {},
    })
  );

  expect(action).not.toBeNull();
  expect((action as any).planSource).toBeUndefined();
  expect((action as any).orgName).toBeUndefined();
  expect((action as any).studiesUsed).toBeUndefined();
  expect((action as any).studiesPerOrgLimit).toBeUndefined();
  expect((action as any).scenariosPerStudyLimit).toBeUndefined();
  expect((action as any).replicationsPerScenarioLimit).toBeUndefined();
  expect((action as any).tradeoffAnalysis).toBeUndefined();
  expect((action as any).chartExport).toBeUndefined();
});

test('mapEntitlements returns null for a non-ENTITLEMENTS_STATUS envelope', () => {
  const other = envelope({}) as EnvelopeBase;
  (other as any).type = EnvelopeMessageType.AUTH_STATUS;
  expect(mapEntitlements(other)).toBeNull();
});
