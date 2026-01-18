/**
 * Name utilities for ensuring unique simulation object names.
 */

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
