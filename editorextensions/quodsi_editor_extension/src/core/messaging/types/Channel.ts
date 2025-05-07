import { EnvelopeBase } from '@quodsi/shared';
import { RoutablePanel } from '../RoutablePanel';

/**
 * Channel information maintained by the router
 * Represents a communication channel to a specific panel
 */
export interface Channel {
  panel?: RoutablePanel;  // The panel interface for sending messages
  ready: boolean;         // Whether the channel is ready to receive messages
  queue: EnvelopeBase[];  // Queue of messages waiting to be sent
}
