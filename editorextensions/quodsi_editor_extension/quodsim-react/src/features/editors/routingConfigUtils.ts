/**
 * Routing Configuration Utilities
 * 
 * Helper functions for working with activity routing configurations
 */

import {
  Connector,
  StateCondition,
  StateComparison,
  ConnectType,
  ComponentType,
  StateListManager,
  State
} from "@quodsi/shared";

/**
 * Get all outgoing connectors for a specific activity
 * 
 * @param activityId - ID of the activity
 * @param allConnectors - Array of all connectors in the model
 * @returns Array of connectors that start from this activity
 */
export function getOutgoingConnectorsForActivity(
  activityId: string,
  allConnectors: Connector[]
): Connector[] {
  return allConnectors.filter(connector => connector.sourceId === activityId);
}

/**
 * Get all incoming connectors for a specific activity
 * 
 * @param activityId - ID of the activity
 * @param allConnectors - Array of all connectors in the model
 * @returns Array of connectors that end at this activity
 */
export function getIncomingConnectorsForActivity(
  activityId: string,
  allConnectors: Connector[]
): Connector[] {
  return allConnectors.filter(connector => connector.targetId === activityId);
}

/**
 * Get entity states available for state condition routing
 * 
 * @param states - StateListManager instance
 * @returns Array of entity states
 */
export function getEntityStatesForRouting(states: StateListManager): State[] {
  return states.getByComponentType(ComponentType.ENTITY);
}

/**
 * Validate that a state condition is complete and valid
 * 
 * @param condition - StateCondition to validate
 * @returns Validation result with errors if any
 */
export function validateStateCondition(
  condition?: StateCondition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!condition) {
    errors.push("No state condition defined");
    return { valid: false, errors };
  }

  if (!condition.stateName) {
    errors.push("State name is required");
  }

  if (!condition.comparison) {
    errors.push("Comparison operator is required");
  }

  if (condition.value === undefined || condition.value === null || condition.value === '') {
    errors.push("Comparison value is required");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate routing configuration for an activity
 * 
 * @param connectType - Type of routing
 * @param connectors - Outgoing connectors
 * @param states - StateListManager for validation
 * @returns Validation result with errors
 */
export function validateRoutingConfiguration(
  connectType: ConnectType,
  connectors: Connector[],
  states: StateListManager
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (connectors.length === 0) {
    warnings.push("No outgoing connectors defined for this activity");
    return { valid: true, errors, warnings };
  }

  switch (connectType) {
    case ConnectType.Probability:
      // Check for zero or negative weights
      connectors.forEach((conn, idx) => {
        if (!conn.weight || conn.weight <= 0) {
          warnings.push(`Connector ${idx + 1} (${conn.name}) has weight ${conn.weight || 0}. Weight must be greater than 0.`);
        }
      });
      break;

    case ConnectType.StateCondition:
      // Validate state conditions
      const entityStates = getEntityStatesForRouting(states);

      if (entityStates.length === 0) {
        errors.push("No entity states defined. State condition routing requires entity states.");
      }

      connectors.forEach((conn, idx) => {
        const validation = validateStateCondition(conn.stateCondition);
        if (!validation.valid) {
          errors.push(`Connector ${idx + 1} (${conn.name}): ${validation.errors.join(', ')}`);
        }
      });
      break;

    case ConnectType.EntityTemplate:
      // Validate entity templates
      connectors.forEach((conn, idx) => {
        if (!conn.entityTemplateUniqueId) {
          warnings.push(`Connector ${idx + 1} (${conn.name}) has no entity template assigned`);
        }
      });
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create a default state condition for a connector
 * 
 * @param stateName - Name of the state to use
 * @param value - Default value for the condition
 * @returns New StateCondition instance
 */
export function createDefaultStateCondition(
  stateName: string,
  value: number | string | boolean = ''
): StateCondition {
  return new StateCondition(
    stateName,
    StateComparison.EQUAL,
    value
  );
}

/**
 * Get a human-readable description of routing configuration
 * 
 * @param connectType - Type of routing
 * @param connectors - Outgoing connectors
 * @returns Description string
 */
export function getRoutingDescription(
  connectType: ConnectType,
  connectors: Connector[]
): string {
  if (connectors.length === 0) {
    return "No outgoing connectors";
  }

  switch (connectType) {
    case ConnectType.Probability:
      return `${connectors.length} connector(s) with probability-based routing`;

    case ConnectType.StateCondition:
      const validConditions = connectors.filter(c => c.stateCondition).length;
      return `${connectors.length} connector(s) with state-based routing (${validConditions} configured)`;

    case ConnectType.EntityTemplate:
      const assignedTemplates = connectors.filter(c => c.entityTemplateUniqueId).length;
      return `${connectors.length} connector(s) with entity template routing (${assignedTemplates} assigned)`;

    default:
      return `${connectors.length} connector(s)`;
  }
}

/**
 * Check if routing configuration is complete
 * 
 * @param connectType - Type of routing
 * @param connectors - Outgoing connectors
 * @returns True if configuration is complete
 */
export function isRoutingConfigurationComplete(
  connectType: ConnectType,
  connectors: Connector[]
): boolean {
  if (connectors.length === 0) {
    return true; // No connectors is valid
  }

  switch (connectType) {
    case ConnectType.Probability:
      // Check if all weights are positive
      return connectors.every(c => c.weight && c.weight > 0);

    case ConnectType.StateCondition:
      // Check if all connectors have valid state conditions
      return connectors.every(c => {
        const validation = validateStateCondition(c.stateCondition);
        return validation.valid;
      });

    case ConnectType.EntityTemplate:
      // Check if all connectors have entity templates assigned
      return connectors.every(c => !!c.entityTemplateUniqueId);

    default:
      return false;
  }
}
