// A page already at the current MODEL_SCHEMA_VERSION must not be "upgraded":
// BaseVersionUpgrader.preflight() reports canUpgrade = !hasErrors and never
// compares source to target, so handlePageLoad ran a no-op upgrade on every
// load — writing to the document while Lucid was still loading ("Document
// Actions should not run before the application has loaded") and notifying
// "Model upgrade required from X to X" twice (seen 2026-08-27).
import { LucidVersionManager } from '../../src/versioning/LucidVersionManager';

function managerWith(preflight: { sourceVersion: string; targetVersion: string; canUpgrade: boolean; issues: unknown[] }) {
  const lvm = new LucidVersionManager();
  const performUpgrade = jest.fn(async () => {});
  const showMessage = jest.fn();
  (lvm as any).versionManager = { checkUpgrade: jest.fn(async () => preflight), performUpgrade };
  (lvm as any).notificationService = { showMessage, showWarning: jest.fn(), showError: jest.fn() };
  return { lvm, performUpgrade, showMessage };
}

describe('LucidVersionManager.handlePageLoad', () => {
  it('does nothing when the page is already at the target version', async () => {
    const { lvm, performUpgrade, showMessage } = managerWith({
      sourceVersion: '2026.11.01', targetVersion: '2026.11.01', canUpgrade: true, issues: [],
    });
    const result = await lvm.handlePageLoad({} as any);
    expect(result.upgraded).toBe(false);
    expect(performUpgrade).not.toHaveBeenCalled();
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('still upgrades a page at an older version', async () => {
    const { lvm, performUpgrade } = managerWith({
      sourceVersion: '2026.10.11', targetVersion: '2026.11.01', canUpgrade: true, issues: [],
    });
    const result = await lvm.handlePageLoad({} as any);
    expect(result).toMatchObject({ upgraded: true, sourceVersion: '2026.10.11', targetVersion: '2026.11.01' });
    expect(performUpgrade).toHaveBeenCalledTimes(1);
  });
});
