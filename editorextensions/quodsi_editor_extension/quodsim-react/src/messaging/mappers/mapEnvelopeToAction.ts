import { EnvelopeBase } from '@quodsi/shared';
import { MessagingAction } from '../reducer';
import { mapFramework } from './framework.mapper';
import { mapAuth } from './auth.mapper';
import { mapSubscription } from './subscription.mapper';
import { mapSelection } from './selection.mapper';
import { mapSimulation } from './simulation.mapper';
import { mapModelOps } from './modelOps.mapper';
import { mapStorage } from './storage.mapper';
import { debugService } from '../utils/debugService';

/**
 * The order of mappers determines priority when multiple mappers
 * could handle the same message type
 */
const mappers = [
  mapFramework,
  mapAuth,
  mapSubscription, 
  mapSelection,
  mapSimulation,
  mapModelOps,
  mapStorage
];

/**
 * Master mapper function that tries each category mapper in sequence
 * 
 * @param msg The envelope message to map
 * @returns The first non-null action returned by a mapper, or null if no mapper handled it
 */
export function mapEnvelopeToAction(msg: EnvelopeBase): MessagingAction | null {
  // Try each mapper until one returns a non-null result
  for (const mapper of mappers) {
    try {
      const action = mapper(msg);
      if (action) {
        debugService.debug(`Mapped ${msg.type} to action ${action.type}`);
        return action;
      }
    } catch (error) {
      // Log errors but continue trying other mappers
      debugService.error(`Error in mapper for message ${msg.type}:`, error);
    }
  }
  
  // No mapper handled the message
  debugService.debug(`No mapper handled message type: ${msg.type}`);
  return null;
}
