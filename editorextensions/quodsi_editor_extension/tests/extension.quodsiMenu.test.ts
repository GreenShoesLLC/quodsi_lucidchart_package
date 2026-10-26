import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { Viewport, menuItemsForTests } from './__mocks__/lucid-extension-sdk';

const sendMock = jest.fn();
jest.mock('../src/core/messaging/index', () => ({ router: { send: sendMock } }));
const autoConvertMock = jest.fn();
jest.mock('../src/core/messaging/handlers/diagramMappingRelayHandler', () => ({
  DiagramMappingRelayHandler: { handleMessage: autoConvertMock },
}));
const simulationRunMock = jest.fn();
jest.mock('../src/core/messaging/handlers/simulationRunHandler', () => ({
  SimulationRunHandler: { handleMessage: simulationRunMock },
}));
const modelRootMock = jest.fn();
jest.mock('../src/core/messaging/handlers/modelRootHandler', () => ({
  ModelRootHandler: { handleMessage: modelRootMock },
}));
let converted = false;
jest.mock('../src/core/ModelManager', () => ({
  ModelManager: { getInstance: () => ({ isQuodsiModel: () => converted }) },
}));

import { registerQuodsiMenu } from '../src/core/quodsiMenu';
import { TourHandler } from '../src/core/messaging/handlers/tourHandler';

let currentPage: unknown;
(Viewport.prototype as any).getCurrentPage = () => currentPage;

/** Registers the menu and returns the registered actions by name. */
function setup() {
  const actions = new Map<string, () => unknown>();
  const order: string[] = [];
  const show = jest.fn(() => order.push('show'));
  sendMock.mockImplementation(() => order.push('send'));
  registerQuodsiMenu(
    { registerAction: (name: string, fn: () => unknown) => actions.set(name, fn) } as any,
    { show },
  );
  return { actions, show, order };
}

describe('the extension Quodsi menu', () => {
  beforeEach(() => {
    sendMock.mockReset();
    autoConvertMock.mockClear();
    simulationRunMock.mockClear();
    menuItemsForTests.length = 0;
    currentPage = { id: 'page-1' };
    converted = false;
  });

  it("lists drawio's items in drawio's order, minus the panel toggle and About", () => {
    setup();
    expect(menuItemsForTests.map((i) => i.label)).toEqual([
      'Convert Diagram to Model',
      'Remove Quodsi Model',
      'Diagram Mapping',
      'Take the Tour',
      'Status',
      'Feedback & Support',
    ]);
    expect(menuItemsForTests.every((i) => i.location === 'extension')).toBe(true);
  });

  it('offers Convert only on an unconverted page, Remove and Diagram Mapping only on a model', () => {
    const { actions } = setup();
    const visible = (label: string) => {
      const item = menuItemsForTests.find((i) => i.label === label);
      return item.visibleAction ? actions.get(item.visibleAction)!() : true;
    };

    expect(visible('Convert Diagram to Model')).toBe(true);
    expect(visible('Remove Quodsi Model')).toBe(false);
    expect(visible('Diagram Mapping')).toBe(false);

    converted = true;
    expect(visible('Convert Diagram to Model')).toBe(false);
    expect(visible('Remove Quodsi Model')).toBe(true);
    expect(visible('Diagram Mapping')).toBe(true);

    currentPage = undefined;
    expect(visible('Convert Diagram to Model')).toBe(false);
    expect(visible('Remove Quodsi Model')).toBe(false);
  });

  it('Convert shows the panel and runs the one-click auto-convert', () => {
    const { actions, show } = setup();
    actions.get('quodsi.convert')!();
    expect(show).toHaveBeenCalled();
    expect(autoConvertMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: EnvelopeMessageType.AUTO_CONVERT_PAGE }),
    );
  });

  it.each([
    ['quodsi.remove', 'remove-model'],
    ['quodsi.diagramMapping', 'diagram-mapping'],
  ])('%s shows the panel, then sends it MENU_COMMAND %s', (action, command) => {
    const { actions, order } = setup();
    actions.get(action)!();
    expect(order).toEqual(['show', 'send']);
    expect(sendMock).toHaveBeenCalledWith(
      'model',
      expect.objectContaining({ type: EnvelopeMessageType.MENU_COMMAND, data: { command } }),
    );
  });

  it('Take the Tour shows the panel and sends TOUR_START {reset:true}', () => {
    const { actions, order } = setup();
    actions.get('quodsi.takeTour')!();
    expect(order).toEqual(['show', 'send']);
    expect(sendMock).toHaveBeenCalledWith(
      'model',
      expect.objectContaining({ type: EnvelopeMessageType.TOUR_START, data: { reset: true } }),
    );
  });

  it('Status opens the Status modal without the panel', () => {
    const { actions, show } = setup();
    actions.get('quodsi.status')!();
    expect(simulationRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: EnvelopeMessageType.OPEN_STATUS_MODAL }),
    );
    expect(show).not.toHaveBeenCalled();
  });

  it('Feedback & Support opens the Settings modal (its Help holds it) without the panel', () => {
    const { actions, show } = setup();
    actions.get('quodsi.feedback')!();
    expect(modelRootMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: EnvelopeMessageType.OPEN_SETTINGS_MODAL }),
    );
    expect(show).not.toHaveBeenCalled();
  });

  it('a TOUR_START from the Settings modal starts the tour the same way', () => {
    const { order } = setup();
    expect(TourHandler.handleMessage({
      id: '', type: EnvelopeMessageType.TOUR_START, source: 'settings-iframe', target: 'host', version: '1.0', data: {},
    } as any)).toBe(true);
    expect(order).toEqual(['show', 'send']);
    expect(sendMock).toHaveBeenCalledWith(
      'model',
      expect.objectContaining({ type: EnvelopeMessageType.TOUR_START, data: { reset: true } }),
    );
  });
});
