/**
 * Name utilities for ensuring unique simulation object names.
 */

import { ModelDefinition } from '@quodsi/shared';
import { SimulationObjectType } from '@quodsi/shared';

/**
 * Generates a unique name by appending a truncated element ID suffix.
 * @param baseName - The original name (e.g., "Triage")
 * @param elementId - The platform element ID to use as suffix
 * @param suffixLength - How many characters of ID to append (default: 6)
 * @returns Unique name like "Triage_a1b2c3"
 */
export function generateUniqueName(
    baseName: string,
    elementId: string,
    suffixLength: number = 6
): string {
    const suffix = elementId.slice(-suffixLength);
    return `${baseName}_${suffix}`;
}

/**
 * Ensures a name is unique for the given type, generating a suffixed
 * version if necessary.
 * @param model - The ModelDefinition to check against
 * @param type - The simulation object type
 * @param name - The desired name
 * @param elementId - The element ID for suffix generation
 * @returns The original name if unique, or a suffixed version
 */
export function ensureUniqueName(
    model: ModelDefinition,
    type: SimulationObjectType,
    name: string,
    elementId: string
): string {
    if (model.isNameUniqueForType(type, name)) {
        return name;
    }
    return generateUniqueName(name, elementId);
}
