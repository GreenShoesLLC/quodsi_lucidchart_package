// tests/messaging/simulationRunHandler.requestStudioCatalog.test.ts
//
// Review R1 (CRITICAL) on wire-cleanup Phase B2 Task 9's F4 fix:
// `handleRequestStudioCatalog` called `modelDefinition.model.finishDateTime
// .toISOString()` unconditionally. `Model.finishDateTime` is TYPED `Date |
// null`, but in the Lucid host it is whatever `StorageAdapter`'s
// `JSON.parse` actually produced — an ISO STRING, never coerced to a real
// `Date` anywhere in `ModelLucid.createSimObject` (see `@quodsi/shared`'s
// `modelFields.ts` "DATES:" comment for the general hazard this class of
// bug is). Calling `.toISOString()` on a string throws, which killed the
// ENTIRE catalog send for every real calendar-mode model — the opposite of
// what the F4 fix was trying to do.
//
// The direct-private-method tests in
// simulationRunHandler.buildStudioCatalog.test.ts pin `buildStudioCatalog`'s
// own field mapping correctly, but they construct their input by hand and
// so never exercise the REAL storage-parsed value that actually broke this
// — that's how it slipped. This file goes through the real
// `handleRequestStudioCatalog` message handler, backed by a REAL
// `ModelLucid` reading a REAL stored JSON blob (so `finishDateTime` is
// genuinely a string, the same way `JSON.parse` produces it on every real
// page), not a hand-typed `new Date(...)` literal.

import { EnvelopeMessageType, SimulationObjectType } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelLucid } from '../../src/types/ModelLucid';
import { makeFakePage } from '../helpers/fakeProxies';

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));

// Stubs the ModelManager singleton entirely — handleRequestStudioCatalog
// only ever calls `ModelManager.getInstance().getModelDefinition()`.
let stubModelDefinition: any;
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => ({
      getModelDefinition: async () => stubModelDefinition,
    }),
  },
}));

import { SimulationRunHandler } from '../../src/core/messaging/handlers/simulationRunHandler';
import { ModelDefinition } from '@quodsi/lucid-shared';

function makeFakePageWithTitle(id: string, title: string): any {
  const page = makeFakePage(id);
  page.getTitle = () => title;
  return page;
}

/** Build a REAL Model via ModelLucid reading a REAL stored (JSON-parsed) blob. */
function buildStorageParsedCalendarModel(): ModelDefinition {
  const page = makeFakePageWithTitle('page-1', 'Calendar Model');
  const storageAdapter = new StorageAdapter();
  storageAdapter.setElementData(
    page,
    {
      id: 'page-1',
      name: 'Calendar Model',
      replications: 1,
      seed: 12345,
      timeUnit: 'minutes',
      timeMode: 'calendar',
      runTime: { value: 30, unit: 'days' },
      startDateTime: '2027-01-01T00:00:00.000Z',
      finishDateTime: '2027-01-31T00:00:00.000Z',
    },
    SimulationObjectType.Model,
  );

  const modelLucid = new ModelLucid(page, storageAdapter);
  const model = modelLucid.getSimulationObject();

  // ModelLucid.createSimObject coerces the raw JSON.parse string into a
  // real Date (see its own `coerceDate` — the fix for the hazard this test
  // exists to pin); confirms the fixture genuinely round-tripped through
  // storage rather than being hand-typed as a Date literal.
  expect(model.finishDateTime).toBeInstanceOf(Date);

  return new ModelDefinition(model);
}

function requestCatalogMessage() {
  return {
    id: 'msg-1',
    type: EnvelopeMessageType.REQUEST_STUDIO_CATALOG,
    source: 'studio-embed-iframe',
    target: 'host',
    version: '1.0',
    data: {},
  } as any;
}

describe('SimulationRunHandler.handleRequestStudioCatalog (review R1)', () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it('sends the catalog (does not throw) for a storage-parsed calendar-mode model, with finishDateTime intact', async () => {
    stubModelDefinition = buildStorageParsedCalendarModel();

    const handled = SimulationRunHandler.handleMessage(requestCatalogMessage());
    expect(handled).toBe(true);

    // handleRequestStudioCatalog is async fire-and-forget from
    // handleMessage's perspective; flush microtasks so it settles.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // The old bug: `.toISOString()` on a string threw inside
    // handleRequestStudioCatalog, the rejection was caught and logged by
    // handleMessage's `.catch(...)`, and STUDIO_CATALOG was never sent at
    // all. Asserting the send actually happened is the regression pin.
    expect(sendMock).toHaveBeenCalledWith(
      'studio-embed',
      expect.objectContaining({
        type: EnvelopeMessageType.STUDIO_CATALOG,
        data: expect.objectContaining({
          catalog: expect.objectContaining({
            model: expect.objectContaining({
              startDateTime: '2027-01-01T00:00:00.000Z',
              finishDateTime: '2027-01-31T00:00:00.000Z',
            }),
          }),
        }),
      }),
    );
  });
});
