// tests/core/sync/scenarioSync.test.ts
//
// The snapshot push reads the model of the page showing, so it pushes only
// when that page is the one the push is keyed to (spec 2026-10-25, advisor
// tasks in Lucid): another page's model never lands under this page's key.
import { Viewport } from '../../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};

const performDataActionMock = jest.fn();
jest.mock('../../../src/utils/LucidDataActionUtility', () => ({
  LucidDataActionUtility: { performDataAction: (...args: unknown[]) => performDataActionMock(...args) },
}));

jest.mock('../../../src/core/sync/pageSvg', () => ({
  alignModelToPageSvg: jest.fn(async () => undefined),
}));

jest.mock('../../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => ({ getModelDefinition: async () => ({}) }),
  },
}));

jest.mock('@quodsi/lucid-shared', () => ({
  ...jest.requireActual('@quodsi/lucid-shared'),
  modelDefinitionToCleanDocument: () => ({ name: 'Clinic' }),
  evaluateValidationGate: () => ({ canSimulate: true }),
}));

import { pushModelDefinitionSnapshot } from '../../../src/core/sync/scenarioSync';

beforeEach(() => {
  performDataActionMock.mockReset();
  performDataActionMock.mockResolvedValue({ status: 200 });
});

describe('pushModelDefinitionSnapshot', () => {
  it('pushes the snapshot for the page showing', async () => {
    currentPage = { id: 'pg-1' };
    await pushModelDefinitionSnapshot({} as any, { documentId: 'doc-1', pageId: 'pg-1', modelName: 'Clinic' });
    expect(performDataActionMock).toHaveBeenCalledTimes(1);
    expect(performDataActionMock.mock.calls[0][1].actionData).toMatchObject({
      pageId: 'pg-1',
      modelDefinitionSnapshot: { name: 'Clinic' },
    });
  });

  it('refuses a page that is not showing: nothing is pushed', async () => {
    currentPage = { id: 'pg-2' };
    await expect(
      pushModelDefinitionSnapshot({} as any, { documentId: 'doc-1', pageId: 'pg-1', modelName: 'Clinic' }),
    ).rejects.toThrow(/not the page showing/);
    expect(performDataActionMock).not.toHaveBeenCalled();
  });

  it.each([400, 500])('rejects when Lucid reports the push failed (HTTP %i)', async (status) => {
    currentPage = { id: 'pg-1' };
    performDataActionMock.mockResolvedValue({ status });
    await expect(
      pushModelDefinitionSnapshot({} as any, { documentId: 'doc-1', pageId: 'pg-1', modelName: 'Clinic' }),
    ).rejects.toThrow(`Model snapshot push failed (HTTP ${status})`);
  });
});
