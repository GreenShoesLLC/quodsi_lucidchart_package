import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/lucid-shared';
import { mapFramework } from './framework.mapper';
import { mapAuth } from './auth.mapper';
import { mapSelection } from './selection.mapper';
import { mapSimulation } from './simulation.mapper';
import { mapModelOps } from './modelOps.mapper';
import { mapElementOps } from './elementOps.mapper';
import { mapEntitlements } from './entitlements.mapper';
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
  mapSelection,
  mapSimulation,
  mapModelOps,
  mapElementOps,
  mapEntitlements,
];

/**
 * Master mapper function that tries each category mapper in sequence
 *
 * @param msg The envelope message to map
 * @returns The first non-null action returned by a mapper, or null if no mapper handled it
 */
export function mapEnvelopeToAction(msg: EnvelopeBase): MessagingAction | null {
  logger.log('MODULAR Mapping envelope to action, type:', msg.type, msg.data);

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
