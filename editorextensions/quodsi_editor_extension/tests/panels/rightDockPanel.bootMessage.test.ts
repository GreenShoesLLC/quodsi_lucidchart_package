// The dock panel's index.html posts QUODSI_PANEL_BOOT as soon as its HTML is
// parsed, so sign-in starts before the React app has downloaded. It is not
// an envelope and must not reach the router.
const receive = jest.fn();
jest.mock('../../src/core/messaging', () => ({ router: { receive, registerChannel: jest.fn() } }));
jest.mock('../../src/core/messaging/handlers', () => ({ SelectionHandler: {}, SimulationHandler: {} }));
const ensureAuthChecked = jest.fn(async () => {});
jest.mock('../../src/core/messaging/handlers/authHandler', () => ({
  AuthHandler: { ensureAuthChecked, registerAuthReadyListener: jest.fn() },
}));

import { RightDockPanel, PANEL_BOOT_MESSAGE } from '../../src/panels/RightDockPanel';

const fakePanel = { debug: { debug: jest.fn(), error: jest.fn() } };

it('a boot message starts the sign-in check and is not routed', () => {
  (RightDockPanel.prototype as any).messageFromFrame.call(fakePanel, { type: PANEL_BOOT_MESSAGE });
  expect(ensureAuthChecked).toHaveBeenCalledTimes(1);
  expect(receive).not.toHaveBeenCalled();
});

it('the string matches the one index.html posts', () => {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '../../quodsim-react/index.html'), 'utf8');
  expect(html).toContain(`type: '${PANEL_BOOT_MESSAGE}'`);
});
