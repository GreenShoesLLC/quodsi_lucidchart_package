// Mapping one line to Connector from the panel still pre-divided its weight to
// 1/outgoing, the rule Convert dropped (LucidPageConversionService: weight is a
// RELATIVE share the engine normalizes; a later fourth branch at 1 against
// three at 0.333 would be 3x as likely). drawio and Visio always use 1.
import { LineProxy } from 'lucid-extension-sdk';
import { SimulationObjectType } from '@quodsi/lucid-shared';

const connector = { id: 'L1', type: SimulationObjectType.Connector, name: 'C', weight: 1 };
const updateFromPlatform = jest.fn();
jest.mock('../../src/services/LucidElementFactory', () => ({
  LucidElementFactory: jest.fn().mockImplementation(() => ({
    createPlatformObject: () => ({ getSimulationObject: () => connector, updateFromPlatform }),
  })),
}));

import { ModelManager } from '../../src/core/ModelManager';

it('a line mapped to Connector by hand keeps weight 1, however many siblings it has', async () => {
  const line = Object.assign(Object.create(LineProxy.prototype), {
    id: 'L1',
    getEndpoint1: () => ({ connection: { id: 'A' } }),
    getEndpoint2: () => ({ connection: { id: 'B' } }),
  });
  const sibling = (id: string) => ({ id, getEndpoint1: () => ({ connection: { id: 'A' } }) });
  const page = { id: 'p1', allLines: new Map<string, unknown>([['L1', line], ['L2', sibling('L2')], ['L3', sibling('L3')]]) };
  const registerElement = jest.fn(async () => {});
  const self = {
    debug: { debug: jest.fn(), error: jest.fn() },
    getModel: () => ({}),
    storageAdapter: {},
    registerElement,
  };

  await (ModelManager.prototype as any).handleTypeConversion.call(self, line, SimulationObjectType.Connector, page);

  expect(registerElement).toHaveBeenCalledWith(connector, line);
  expect(connector.weight).toBe(1);
});
