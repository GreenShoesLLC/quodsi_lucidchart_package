import { EditorClient, Menu, MenuLocation, Viewport } from 'lucid-extension-sdk';
import { EnvelopeMessageType, type MenuCommand } from '@quodsi/lucid-shared';
import { router } from './messaging';
import { DiagramMappingRelayHandler } from './messaging/handlers/diagramMappingRelayHandler';
import { SimulationRunHandler } from './messaging/handlers/simulationRunHandler';
import { TourHandler } from './messaging/handlers/tourHandler';
import { ModelManager } from './ModelManager';

export const CONVERT_ACTION = 'quodsi.convert';
export const REMOVE_ACTION = 'quodsi.remove';
export const DIAGRAM_MAPPING_ACTION = 'quodsi.diagramMapping';
export const TAKE_TOUR_ACTION = 'quodsi.takeTour';
export const STATUS_ACTION = 'quodsi.status';
const IS_CONVERTED_ACTION = 'quodsi.isConverted';
const IS_UNCONVERTED_ACTION = 'quodsi.isUnconverted';

/**
 * The extension's "Quodsi" menu in Lucid's top bar (its label is the editor
 * extension's manifest title). Mirrors drawio's Quodsi menu
 * (quodsi_drawio/src/app/QuodsiMenuPlugin.ts), minus Open Example and Reload
 * Model, which Lucid has no equivalent for, Show/Hide Panel (Lucid's own dock
 * already opens and closes the panel; ours did nothing visible when it was
 * open) and About (Status shows the same version, and its version line holds
 * the developer-mode switch). Lucid's menu has no separators, so Status
 * simply comes last.
 *
 * Convert and Status run here in the extension; Take the Tour is TourHandler's
 * startTour, which Settings' "Take the tour" also uses. Remove and Diagram
 * Mapping need the model panel (its Remove confirmation, its window-size
 * preference and pending-edit flush), so they show the panel and send it
 * MENU_COMMAND, which queues until REACT_APP_READY.
 * Convert and Remove are offered only on the page state they apply to, as in
 * drawio; Diagram Mapping only on a model page.
 */
export function registerQuodsiMenu(client: EditorClient, panel: { show(): void }): void {
  const currentPage = () => new Viewport(client).getCurrentPage();
  const isConverted = () => {
    const page = currentPage();
    return !!page && ModelManager.getInstance().isQuodsiModel(page);
  };
  const sendToPanel = (command: MenuCommand) => {
    panel.show();
    router.send('model', {
      id: '',
      type: EnvelopeMessageType.MENU_COMMAND,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: { command },
    });
  };

  TourHandler.showPanel = () => panel.show();

  client.registerAction(IS_CONVERTED_ACTION, () => isConverted());
  client.registerAction(IS_UNCONVERTED_ACTION, () => !!currentPage() && !isConverted());

  // The blank-slate card's one-click conversion. Its result goes to the model
  // panel, whose card ignores an id it did not send; the post-convert refresh
  // then moves the panel to the model editor.
  client.registerAction(CONVERT_ACTION, () => {
    panel.show();
    DiagramMappingRelayHandler.handleMessage({
      id: `menu-convert-${Date.now()}`,
      type: EnvelopeMessageType.AUTO_CONVERT_PAGE,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: {},
    });
  });
  client.registerAction(REMOVE_ACTION, () => sendToPanel('remove-model'));
  client.registerAction(DIAGRAM_MAPPING_ACTION, () => sendToPanel('diagram-mapping'));
  client.registerAction(TAKE_TOUR_ACTION, () => TourHandler.startTour());
  client.registerAction(STATUS_ACTION, () => {
    SimulationRunHandler.handleMessage({
      id: '',
      type: EnvelopeMessageType.OPEN_STATUS_MODAL,
      source: 'host',
      target: 'host',
      version: '1.0',
      data: {},
    });
  });

  const menu = new Menu(client);
  const add = (label: string, action: string, visibleAction?: string) =>
    menu.addDropdownMenuItem({ label, action, visibleAction, location: MenuLocation.Extension });
  add('Convert Diagram to Model', CONVERT_ACTION, IS_UNCONVERTED_ACTION);
  add('Remove Quodsi Model', REMOVE_ACTION, IS_CONVERTED_ACTION);
  add('Diagram Mapping', DIAGRAM_MAPPING_ACTION, IS_CONVERTED_ACTION);
  add('Take the Tour', TAKE_TOUR_ACTION);
  add('Status', STATUS_ACTION);
}
