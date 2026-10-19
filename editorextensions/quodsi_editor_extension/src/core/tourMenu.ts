import { EditorClient, Menu, MenuLocation } from 'lucid-extension-sdk';
import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { router } from './messaging';

export const TAKE_TOUR_ACTION = 'quodsi.takeTour';

/**
 * Adds "Take the Quodsi tour" to the extension menu. The action opens the
 * dock panel and asks the model panel to restart the tour; if the panel was
 * closed, the message queues until REACT_APP_READY.
 */
export function registerTourMenu(client: EditorClient, panel: { show(): void }): void {
  client.registerAction(TAKE_TOUR_ACTION, () => {
    panel.show();
    router.send('model', {
      id: '',
      type: EnvelopeMessageType.TOUR_START,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: { reset: true },
    });
  });
  new Menu(client).addDropdownMenuItem({
    label: 'Take the Quodsi tour',
    action: TAKE_TOUR_ACTION,
    location: MenuLocation.Extension,
  });
}
