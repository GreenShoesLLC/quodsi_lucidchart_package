import { entitlementsReducer, initialEntitlementsState, planDisplayLabel } from './entitlementsSlice';

test('ENTITLEMENTS_STATUS_UPDATE stores upgradeAvailable=false', () => {
  const s = entitlementsReducer(initialEntitlementsState, {
    type: 'ENTITLEMENTS_STATUS_UPDATE',
    subjectType: 'organization', planKey: 'quodsi_free', planStatus: 'active',
    features: {}, upgradeAvailable: false,
  } as any);
  expect(s.upgradeAvailable).toBe(false);
});

test('missing upgradeAvailable defaults to null (fail-open)', () => {
  const s = entitlementsReducer(initialEntitlementsState, {
    type: 'ENTITLEMENTS_STATUS_UPDATE',
    subjectType: 'organization', planKey: 'quodsi_free', planStatus: 'active',
    features: {},
  } as any);
  expect(s.upgradeAvailable).toBeNull();
});

test('initial state upgradeAvailable is null', () => {
  expect(initialEntitlementsState.upgradeAvailable).toBeNull();
});

test('ENTITLEMENTS_STATUS_UPDATE stores the new study-keyed / org-context fields', () => {
  const s = entitlementsReducer(initialEntitlementsState, {
    type: 'ENTITLEMENTS_STATUS_UPDATE',
    subjectType: 'organization', planKey: 'quodsi_pro', planStatus: 'active',
    features: {},
    planSource: 'kinde_org',
    orgName: 'Acme Co',
    studiesUsed: 3,
    studiesPerOrgLimit: 10,
    scenariosPerStudyLimit: 25,
    replicationsPerScenarioLimit: 100,
    tradeoffAnalysis: true,
    chartExport: true,
  } as any);

  expect(s.planSource).toBe('kinde_org');
  expect(s.orgName).toBe('Acme Co');
  expect(s.studiesUsed).toBe(3);
  expect(s.studiesPerOrgLimit).toBe(10);
  expect(s.scenariosPerStudyLimit).toBe(25);
  expect(s.replicationsPerScenarioLimit).toBe(100);
  expect(s.tradeoffAnalysis).toBe(true);
  expect(s.chartExport).toBe(true);
});

test('ENTITLEMENTS_STATUS_UPDATE defaults new fields to null when absent (old-host compat)', () => {
  const s = entitlementsReducer(initialEntitlementsState, {
    type: 'ENTITLEMENTS_STATUS_UPDATE',
    subjectType: 'organization', planKey: 'quodsi_free', planStatus: 'active',
    features: {},
  } as any);

  expect(s.planSource).toBeNull();
  expect(s.orgName).toBeNull();
  expect(s.studiesUsed).toBeNull();
  expect(s.studiesPerOrgLimit).toBeNull();
  expect(s.scenariosPerStudyLimit).toBeNull();
  expect(s.replicationsPerScenarioLimit).toBeNull();
  expect(s.tradeoffAnalysis).toBeNull();
  expect(s.chartExport).toBeNull();
});

test('initial state has null defaults for the new fields', () => {
  expect(initialEntitlementsState.planSource).toBeNull();
  expect(initialEntitlementsState.orgName).toBeNull();
  expect(initialEntitlementsState.studiesUsed).toBeNull();
  expect(initialEntitlementsState.studiesPerOrgLimit).toBeNull();
  expect(initialEntitlementsState.scenariosPerStudyLimit).toBeNull();
  expect(initialEntitlementsState.replicationsPerScenarioLimit).toBeNull();
  expect(initialEntitlementsState.tradeoffAnalysis).toBeNull();
  expect(initialEntitlementsState.chartExport).toBeNull();
});

describe('planDisplayLabel', () => {
  test('maps legacy plan codes', () => {
    expect(planDisplayLabel({ ...initialEntitlementsState, loaded: true, planKey: 'quodsi_free_user' })).toBe('Free plan');
    expect(planDisplayLabel({ ...initialEntitlementsState, loaded: true, planKey: 'quodsi_pro_user' })).toBe('Pro plan');
    expect(planDisplayLabel({ ...initialEntitlementsState, loaded: true, planKey: 'quodsi_pro_team' })).toBe('Team plan');
    expect(planDisplayLabel({ ...initialEntitlementsState, loaded: true, planKey: 'quodsi_enterprise_team' })).toBe('Enterprise');
  });

  test('maps the new plan codes', () => {
    expect(planDisplayLabel({ ...initialEntitlementsState, loaded: true, planKey: 'quodsi_free' })).toBe('Free plan');
    expect(planDisplayLabel({ ...initialEntitlementsState, loaded: true, planKey: 'quodsi_pro' })).toBe('Professional');
    expect(planDisplayLabel({ ...initialEntitlementsState, loaded: true, planKey: 'quodsi_early_adopter' })).toBe('Early Adopter');
    expect(planDisplayLabel({ ...initialEntitlementsState, loaded: true, planKey: 'quodsi_employee' })).toBe('Employee');
  });
});
