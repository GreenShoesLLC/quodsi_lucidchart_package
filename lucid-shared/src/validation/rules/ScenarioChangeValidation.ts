import { ScenarioPropertyName, ScenarioSetterType } from "@quodsi/shared";

export interface ChangeRequestValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Minimum allowed result value for each property.
 * null means no minimum (any value is valid).
 */
const PROPERTY_MIN_VALUE: Record<string, { min: number; exclusive: boolean } | null> = {
  [ScenarioPropertyName.CAPACITY]: { min: 1, exclusive: false },
  [ScenarioPropertyName.ACTIVITY_CAPACITY]: { min: 1, exclusive: false },
  [ScenarioPropertyName.INBOUND_QUEUE_CAPACITY]: { min: 0, exclusive: false },
  [ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY]: { min: 0, exclusive: false },
  [ScenarioPropertyName.WEIGHT]: { min: 0, exclusive: false },
  [ScenarioPropertyName.MAX_ENTITIES]: { min: 1, exclusive: false },
  [ScenarioPropertyName.ENTITIES_PER_CREATION]: { min: 1, exclusive: false },
  [ScenarioPropertyName.REPS]: { min: 1, exclusive: false },
  [ScenarioPropertyName.SEED]: null,
  [ScenarioPropertyName.RUN_PERIOD]: { min: 0, exclusive: true },
};

/**
 * Properties that must be integers (no decimals allowed for EQUAL/MINIMUM/MAXIMUM).
 */
const INTEGER_PROPERTIES = new Set<string>([
  ScenarioPropertyName.CAPACITY,
  ScenarioPropertyName.ACTIVITY_CAPACITY,
  ScenarioPropertyName.INBOUND_QUEUE_CAPACITY,
  ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY,
  ScenarioPropertyName.MAX_ENTITIES,
  ScenarioPropertyName.ENTITIES_PER_CREATION,
  ScenarioPropertyName.REPS,
  ScenarioPropertyName.SEED,
]);

function formatMin(min: number, exclusive: boolean): string {
  return exclusive ? `greater than ${min}` : `at least ${min}`;
}

/**
 * Validates a scenario change request value based on the property and setter type.
 * Returns validation errors (blocking) and warnings (non-blocking hints).
 */
export function validateChangeRequestValue(
  propertyName: ScenarioPropertyName,
  setterType: ScenarioSetterType,
  value: number
): ChangeRequestValidationResult {
  const propConstraint = PROPERTY_MIN_VALUE[propertyName];

  // Check integer enforcement for direct-value setter types
  if (
    INTEGER_PROPERTIES.has(propertyName) &&
    (setterType === ScenarioSetterType.EQUAL ||
      setterType === ScenarioSetterType.MINIMUM ||
      setterType === ScenarioSetterType.MAXIMUM ||
      setterType === ScenarioSetterType.ADD ||
      setterType === ScenarioSetterType.SUBTRACT)
  ) {
    if (!Number.isInteger(value)) {
      return { valid: false, error: "Value must be a whole number for this property" };
    }
  }

  switch (setterType) {
    case ScenarioSetterType.EQUAL: {
      if (propConstraint !== null) {
        const { min, exclusive } = propConstraint;
        if (exclusive ? value <= min : value < min) {
          return { valid: false, error: `Value must be ${formatMin(min, exclusive)}` };
        }
      }
      return { valid: true };
    }

    case ScenarioSetterType.ADD:
    case ScenarioSetterType.SUBTRACT: {
      if (value === 0) {
        return { valid: true, warning: "Adding or subtracting 0 has no effect" };
      }
      return { valid: true };
    }

    case ScenarioSetterType.MULTIPLY: {
      // SEED has no constraints on multiply except nonzero
      if (propConstraint === null) {
        if (value === 0) {
          return { valid: false, error: "Cannot multiply by 0" };
        }
        return { valid: true };
      }
      // WEIGHT allows multiply by 0 (disables connector)
      if (propertyName === ScenarioPropertyName.WEIGHT) {
        if (value < 0) {
          return { valid: false, error: "Multiplier must be >= 0" };
        }
        if (value === 1) {
          return { valid: true, warning: "Multiplying by 1 has no effect" };
        }
        return { valid: true };
      }
      // All other properties: must be > 0
      if (value <= 0) {
        return { valid: false, error: "Multiplier must be greater than 0" };
      }
      if (value === 1) {
        return { valid: true, warning: "Multiplying by 1 has no effect" };
      }
      return { valid: true };
    }

    case ScenarioSetterType.DIVIDE: {
      if (value === 0) {
        return { valid: false, error: "Cannot divide by 0" };
      }
      // SEED: any nonzero
      if (propConstraint === null) {
        return { valid: true };
      }
      if (value < 0) {
        return { valid: false, error: "Divisor must be greater than 0" };
      }
      if (value === 1) {
        return { valid: true, warning: "Dividing by 1 has no effect" };
      }
      return { valid: true };
    }

    case ScenarioSetterType.MINIMUM:
    case ScenarioSetterType.MAXIMUM: {
      if (propConstraint !== null) {
        const { min, exclusive } = propConstraint;
        if (exclusive ? value <= min : value < min) {
          return { valid: false, error: `Value must be ${formatMin(min, exclusive)}` };
        }
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

/**
 * Returns whether the given property requires integer input for the given setter type.
 * MULTIPLY and DIVIDE always allow floats (the engine rounds the result).
 */
export function isIntegerInput(
  propertyName: ScenarioPropertyName,
  setterType: ScenarioSetterType
): boolean {
  if (!INTEGER_PROPERTIES.has(propertyName)) return false;
  return (
    setterType !== ScenarioSetterType.MULTIPLY &&
    setterType !== ScenarioSetterType.DIVIDE
  );
}
