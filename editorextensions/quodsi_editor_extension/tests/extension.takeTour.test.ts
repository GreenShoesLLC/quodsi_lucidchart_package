import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { menuItemsForTests } from './__mocks__/lucid-extension-sdk';

const sendMock = jest.fn();
jest.mock('../src/core/messaging/index', () => ({ router: { send: sendMock } }));

import { registerTourMenu } from '../src/core/tourMenu';

describe('Take the Quodsi tour menu item', () => {
  beforeEach(() => {
    sendMock.mockClear();
    menuItemsForTests.length = 0;
  });

  it('adds the extension menu item bound to quodsi.takeTour', () => {
    registerTourMenu({ registerAction: jest.fn() } as any, { show: jest.fn() } as any);
    expect(menuItemsForTests).toEqual([
      { label: 'Take the Quodsi tour', action: 'quodsi.takeTour', location: 'extension' },
    ]);
  });

  it('the action shows the panel and sends TOUR_START {reset:true} to the model role', () => {
    const order: string[] = [];
    const show = jest.fn(() => order.push('show'));
    sendMock.mockImplementation(() => order.push('send'));
    const registerAction = jest.fn();
    registerTourMenu({ registerAction } as any, { show } as any);

    expect(registerAction).toHaveBeenCalledWith('quodsi.takeTour', expect.any(Function));
    registerAction.mock.calls[0][1]();

    expect(order).toEqual(['show', 'send']);
    expect(sendMock).toHaveBeenCalledWith(
      'model',
      expect.objectContaining({ type: EnvelopeMessageType.TOUR_START, data: { reset: true } }),
    );
  });
});
