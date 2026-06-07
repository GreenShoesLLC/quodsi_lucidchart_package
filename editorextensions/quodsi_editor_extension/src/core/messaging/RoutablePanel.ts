import { EnvelopeBase } from '@quodsi/lucid-shared';

/**
 * Interface that must be implemented by Panel classes to work with the MessageRouter.
 * This provides the contract that allows the router to relay messages to panel iframes.
 */
export interface RoutablePanel {
  /**
   * Relay a message to the iframe contained in this panel
   * 
   * @param msg The envelope to deliver to the iframe
   */
  relayToIframe(msg: EnvelopeBase): void;
}
