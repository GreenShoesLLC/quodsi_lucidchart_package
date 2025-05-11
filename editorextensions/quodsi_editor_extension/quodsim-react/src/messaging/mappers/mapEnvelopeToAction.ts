import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { mapFramework } from './framework.mapper';
import { mapAuth } from './auth.mapper';
import { mapSubscription } from './subscription.mapper';
import { mapSelection } from './selection.mapper';
import { mapSimulation } from './simulation.mapper';
import { mapModelOps } from './modelOps.mapper';
import { mapStorage } from './storage.mapper';
import { debugService } from '../utils/debugService';
import { MessagingAction } from '../state/types';

// Create a component-specific logger
const logger = debugService.forComponent('MessageMapper');

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
  // Add special handling for AUTH_STATUS messages
  logger.log('MODULAR Mapping envelope to action, type:', msg.type, msg.data);
  if (msg.type === EnvelopeMessageType.AUTH_STATUS) {
    logger.log('Priority handling for AUTH_STATUS message:', msg);
    // Always try auth mapper first for AUTH_STATUS messages
    try {
      const action = mapAuth(msg);
      if (action) {
        logger.log('Successfully mapped AUTH_STATUS to action:', action);
        return action;
      }
    } catch (error) {
      logger.error('Error in auth mapper for AUTH_STATUS message:', error);
    }
  }
  
  // Try each mapper until one returns a non-null result
  for (const mapper of mappers) {
    try {
      const action = mapper(msg);
      if (action) {
        logger.log(`Mapped ${msg.type} to action ${action.type}`);
        return action;
      }
    } catch (error) {
      // Log errors but continue trying other mappers
      logger.error(`Error in mapper for message ${msg.type}:`, error);
    }
  }
  
  // No mapper handled the message
  logger.debug(`No mapper handled message type: ${msg.type}`);
  return null;
}
