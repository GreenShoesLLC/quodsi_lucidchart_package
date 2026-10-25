/**
 * Extension menu messages: the "Quodsi" menu in Lucid's top bar runs some of
 * its items inside the model panel, because they need the panel's state (the
 * window-size preference and the pending-edit flush for Diagram Mapping) or
 * its own UI (the Remove confirmation). The menu shows the
 * panel, then sends MENU_COMMAND, which queues until REACT_APP_READY like
 * TOUR_START.
 */

/** A menu item the model panel carries out. */
export type MenuCommand = 'diagram-mapping' | 'remove-model';

/** Host -> panel MENU_COMMAND. No reply. */
export type MenuCommandData = { command: MenuCommand };
