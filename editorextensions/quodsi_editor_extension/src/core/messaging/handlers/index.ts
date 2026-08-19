import { EnvelopeBase, getLogger } from '@quodsi/lucid-shared';
import { FrameworkHandler } from './frameworkHandler';

import { SimulationHandler } from './simulationHandler';
import { ModelOpsHandler } from './modelOpsHandler';
import { ElementOpsHandler } from './elementOpsHandler';
import { StatesHandler } from './statesHandler';
import { EntitiesHandler } from './entitiesHandler';
import { ModelRootHandler } from './modelRootHandler';
import { ResourceRequirementsHandler } from './resourceRequirementsHandler';
import { SelectionHandler } from './selection';
import { SimulationRunHandler } from './simulationRunHandler';
import { DiagramMappingRelayHandler } from './diagramMappingRelayHandler';
import { AuthHandler } from './authHandler';
import { DevtoolsHandler } from './devtoolsHandler';
import { PortalHandler } from './portalHandler';
import { SwimLaneHandler } from './swimlaneHandler';
import { AnalyticsHandler } from './analyticsHandler';
import { UpgradeInterestHandler } from './upgradeInterestHandler';

const log = getLogger('MessageHandlers');

/**
 * Central handler registry that dispatches messages to the appropriate category handler
 */
export class MessageHandlers {
  /**
   * Dispatch a message to the appropriate handler
   * 
   * @param msg The message to handle
   * @returns Whether the message was handled by any handler
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    log.trace(`Handling message type: ${msg.type}`);
    
    // Try each handler in order of priority

    // Framework messages have highest priority
    if (FrameworkHandler.handleMessage(msg)) {
      log.trace(`Message ${msg.type} handled by FrameworkHandler`);
      return true;
    }

    // Auth messages
    if (AuthHandler.handleMessage(msg)) {
      return true;
    }

    // Selection messages
    if (SelectionHandler.handleMessage(msg)) {
      return true;
    }
    
    // Simulation messages
    if (SimulationHandler.handleMessage(msg)) {
      return true;
    }
    
    // Model operations messages
    if (ModelOpsHandler.handleMessage(msg)) {
      return true;
    }

    // Diagram-mapping relay messages (embedded Studio 2B)
    if (DiagramMappingRelayHandler.handleMessage(msg)) {
      return true;
    }

    // Element operations messages
    if (ElementOpsHandler.handleMessage(msg)) {
      return true;
    }

    // States operations messages
    if (StatesHandler.handleMessage(msg)) {
      return true;
    }

    // Entities operations messages
    if (EntitiesHandler.handleMessage(msg)) {
      return true;
    }

    // Model-root operations messages (generic list route -- arrivalPatterns, etc.)
    if (ModelRootHandler.handleMessage(msg)) {
      return true;
    }

    // Resource requirements operations messages
    if (ResourceRequirementsHandler.handleMessage(msg)) {
      return true;
    }

    // Simulation run messages
    if (SimulationRunHandler.handleMessage(msg)) {
      return true;
    }

    // Swimlane operations
    if (SwimLaneHandler.handleMessage(msg)) {
      return true;
    }

    // DevTools messages
    if (DevtoolsHandler.handleMessage(msg)) {
      return true;
    }

    // Portal URL minting (panel button → API → Kinde)
    if (PortalHandler.handleMessage(msg)) {
      return true;
    }

    // PlanDetails "contact sales" upgrade-interest ping
    if (UpgradeInterestHandler.handleMessage(msg)) {
      return true;
    }

    // Message wasn't handled by any handler
    log.warn(`Unhandled message type: ${msg.type}`);
    return false;
  }
}

// Re-export handlers for direct access
export {
  FrameworkHandler,
  AuthHandler,
  SelectionHandler,
  SimulationHandler,
  ModelOpsHandler,
  ElementOpsHandler,
  StatesHandler,
  EntitiesHandler,
  ModelRootHandler,
  ResourceRequirementsHandler,
  SimulationRunHandler,
  DiagramMappingRelayHandler,
  DevtoolsHandler,
  PortalHandler,
  SwimLaneHandler,
  AnalyticsHandler,
  UpgradeInterestHandler
};
