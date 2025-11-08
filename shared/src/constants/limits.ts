/**
 * System-wide limits and constraints
 */

/**
 * Maximum number of scenarios allowed per document
 *
 * This limit ensures:
 * - Reasonable Azure Storage usage per document
 * - Good UX (not overwhelming the scenario list)
 * - Predictable billing and resource consumption
 */
export const MAX_SCENARIOS = 5;
