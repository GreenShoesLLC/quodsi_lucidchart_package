import { EnvelopeBase } from '@quodsi/shared';
import { FrameworkHandler } from './frameworkHandler';

import { SimulationHandler } from './simulationHandler';
import { ModelOpsHandler } from './modelOpsHandler';
import { ElementOpsHandler } from './elementOpsHandler';
import { StatesHandler } from './statesHandler';
import { ResourceRequirementsHandler } from './resourceRequirementsHandler';
import { TimePatternHandler } from './timePatternHandler';
import { StorageHandler } from './storageHandler';
import { SelectionHandler } from './selection';
import { ScenarioHandler } from './scenarioHandler';
import { ConversionPreviewHandler } from './conversionPreviewHandler';

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
    console.log(`[MessageHandlers] Handling message type: ${msg.type}`);
    
    // Try each handler in order of priority
    
    // Framework messages have highest priority
    if (FrameworkHandler.handleMessage(msg)) {
      console.log(`[MessageHandlers] Message ${msg.type} handled by FrameworkHandler`);
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

    // Conversion preview messages
    if (ConversionPreviewHandler.handleMessage(msg)) {
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

    // Resource requirements operations messages
    if (ResourceRequirementsHandler.handleMessage(msg)) {
      return true;
    }

    // Time pattern operations messages
    if (TimePatternHandler.handleMessage(msg)) {
      return true;
    }

    // Storage messages
    if (StorageHandler.handleMessage(msg)) {
      return true;
    }

    // Scenario messages
    if (ScenarioHandler.handleMessage(msg)) {
      return true;
    }

    // Message wasn't handled by any handler
    console.warn(`Unhandled message type: ${msg.type}`);
    return false;
  }
}

// Re-export handlers for direct access
export {
  FrameworkHandler,
  SelectionHandler,
  SimulationHandler,
  ModelOpsHandler,
  ElementOpsHandler,
  StatesHandler,
  ResourceRequirementsHandler,
  TimePatternHandler,
  StorageHandler,
  ScenarioHandler,
  ConversionPreviewHandler
};
