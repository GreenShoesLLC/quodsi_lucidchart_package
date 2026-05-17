import { entitlementsReducer, initialEntitlementsState } from './entitlementsSlice';

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
