// tests/relay/diagramMappingRelayHandler.pageConversion.test.ts
//
// The model panel's shared blank-slate card (spec 2026-09-15 section 1) asks
// the host for the page's block/line counts and waits on the automatic
// conversion's result. Mocking style mirrors
// tests/messaging/elementOpsHandler.routing.test.ts.

import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));

jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => ({}),
    getClient: () => ({}),
  },
}));

jest.mock('../../src/core/messaging/handlers/selection', () => ({
  SelectionHandler: {},
}));

const analyzeMock = jest.fn();
jest.mock('../../src/services/conversion/LucidPageAnalyzer', () => ({
  LucidPageAnalyzer: jest.fn().mockImplementation(() => ({ analyzePageForPreview: analyzeMock })),
}));

const convertMock = jest.fn();
jest.mock('../../src/services/conversion/LucidPageConversionService', () => ({
  LucidPageConversionService: jest.fn().mockImplementation(() => ({ convertPageWithMappings: convertMock })),
}));

jest.mock('../../src/core/StorageAdapter', () => ({ StorageAdapter: jest.fn() }));
jest.mock('../../src/services/LucidElementFactory', () => ({ LucidElementFactory: jest.fn() }));
jest.mock('../../src/utils/LucidDataActionUtility', () => ({
  LucidDataActionUtility: { performDataAction: jest.fn() },
}));
jest.mock('../../src/core/sync/scenarioSync', () => ({
  canonicalModelName: jest.fn(),
  pushModelDefinitionSnapshot: jest.fn(),
}));

import { EnvelopeMessageType, SimulationObjectType } from '@quodsi/lucid-shared';
import {
  DiagramMappingRelayHandler,
  toPageConversionCounts,
} from '../../src/core/messaging/handlers/diagramMappingRelayHandler';

function envelope(type: EnvelopeMessageType, id: string, data: unknown = {}): any {
  return { id, type, source: 'model-iframe', target: 'host', version: '1.0', data };
}

let refreshSpy: jest.SpyInstance;

beforeEach(() => {
  sendMock.mockClear();
  analyzeMock.mockReset();
  convertMock.mockReset();
  currentPage = {
    id: 'page-1',
    allBlocks: new Map([['b1', {}], ['b2', {}], ['b3', {}]]),
    allLines: new Map([['l1', {}]]),
  };
  refreshSpy = jest
    .spyOn(DiagramMappingRelayHandler as any, 'postConvertRefresh')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  refreshSpy.mockRestore();
});

describe('PAGE_COUNTS_REQUEST', () => {
  it('replies on the model channel with the page block and line counts, echoing the request id', () => {
    expect(DiagramMappingRelayHandler.handleMessage(envelope(EnvelopeMessageType.PAGE_COUNTS_REQUEST, 'req-1'))).toBe(true);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [channel, reply] = sendMock.mock.calls[0];
    expect(channel).toBe('model');
    expect(reply).toMatchObject({
      id: 'req-1',
      type: EnvelopeMessageType.PAGE_COUNTS,
      target: 'model-iframe',
      data: { pageId: 'page-1', shapeCount: 3, lineCount: 1 },
    });
  });

  it('replies zeros when no page is open, so the panel never waits', () => {
    currentPage = null;
    DiagramMappingRelayHandler.handleMessage(envelope(EnvelopeMessageType.PAGE_COUNTS_REQUEST, 'req-2'));
    expect(sendMock.mock.calls[0][1].data).toEqual({ pageId: '', shapeCount: 0, lineCount: 0 });
  });

  it('replies zeros when reading the current page throws, so the panel never waits', () => {
    const original = (Viewport.prototype as any).getCurrentPage;
    (Viewport.prototype as any).getCurrentPage = () => {
      throw new Error('boom');
    };
    try {
      DiagramMappingRelayHandler.handleMessage(envelope(EnvelopeMessageType.PAGE_COUNTS_REQUEST, 'req-3'));
    } finally {
      (Viewport.prototype as any).getCurrentPage = original;
    }

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [channel, reply] = sendMock.mock.calls[0];
    expect(channel).toBe('model');
    expect(reply).toMatchObject({
      id: 'req-3',
      type: EnvelopeMessageType.PAGE_COUNTS,
      target: 'model-iframe',
      data: { pageId: '', shapeCount: 0, lineCount: 0 },
    });
  });
});

describe('AUTO_CONVERT_PAGE result', () => {
  const preview = {
    pageId: 'page-1',
    mappings: [
      { elementId: 'b1', proposedType: SimulationObjectType.Activity },
      { elementId: 'b2', proposedType: null },
      { elementId: 'b3', proposedType: SimulationObjectType.Entity },
    ],
  };

  it('replies success with the conversion counts before the post-convert refresh', async () => {
    analyzeMock.mockReturnValue(preview);
    convertMock.mockResolvedValue({
      success: true,
      modelId: 'page-1',
      elementCount: { activities: 1, generators: 0, resources: 0, connectors: 0 },
    });
    let sendsBeforeRefresh = -1;
    refreshSpy.mockImplementation(() => { sendsBeforeRefresh = sendMock.mock.calls.length; });

    await (DiagramMappingRelayHandler as any).handleAutoConvert(
      envelope(EnvelopeMessageType.AUTO_CONVERT_PAGE, 'req-3', { documentId: 'doc-1', pageId: 'page-1' }),
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [channel, reply] = sendMock.mock.calls[0];
    expect(channel).toBe('model');
    expect(reply).toMatchObject({
      id: 'req-3',
      type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT,
      target: 'model-iframe',
      data: {
        success: true,
        result: { activities: 1, generators: 0, resources: 0, entities: 0, connectors: 0, skipped: 2 },
      },
    });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(sendsBeforeRefresh).toBe(1);
  });

  it('replies failure with the error message and does not refresh', async () => {
    analyzeMock.mockReturnValue(preview);
    convertMock.mockRejectedValue(new Error('page locked'));

    await (DiagramMappingRelayHandler as any).handleAutoConvert(
      envelope(EnvelopeMessageType.AUTO_CONVERT_PAGE, 'req-4', { documentId: 'doc-1', pageId: 'page-1' }),
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][1]).toMatchObject({
      id: 'req-4',
      type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT,
      data: { success: false, error: 'page locked' },
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});

describe('ANALYZE_PAGE from the inline Diagram Mapping modal', () => {
  it("replies on the 'diagram-mapping' channel, targeting 'diagram-mapping-iframe', for a diagram-mapping-iframe-sourced request", async () => {
    analyzeMock.mockReturnValue({ pageId: 'page-1', mappings: [] });

    await (DiagramMappingRelayHandler as any).handleAnalyze({
      id: 'req-dm-1',
      type: EnvelopeMessageType.ANALYZE_PAGE,
      source: 'diagram-mapping-iframe',
      target: 'host',
      version: '1.0',
      data: { requestId: 7 },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [channel, reply] = sendMock.mock.calls[0];
    expect(channel).toBe('diagram-mapping');
    expect(reply).toMatchObject({
      id: 'req-dm-1',
      type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
      target: 'diagram-mapping-iframe',
      data: { requestId: 7, data: { pageId: 'page-1', mappings: [] } },
    });
  });
});

describe('toPageConversionCounts', () => {
  it('maps the element counts, sets entities to 0, and counts null and Entity proposals as skipped', () => {
    expect(
      toPageConversionCounts(
        { activities: 3, generators: 1, resources: 2, connectors: 4 },
        { mappings: [{ proposedType: null }, { proposedType: SimulationObjectType.Entity }, { proposedType: SimulationObjectType.Activity }] },
      ),
    ).toEqual({ activities: 3, generators: 1, resources: 2, entities: 0, connectors: 4, skipped: 2 });
  });
});
