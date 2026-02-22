/**
 * System-wide limits and constraints
 */

/**
 * Maximum number of simulation runs allowed per document
 *
 * This limit ensures:
 * - Reasonable Azure Storage usage per document
 * - Good UX (not overwhelming the run list)
 * - Predictable billing and resource consumption
 */
export const MAX_SIMULATION_RUNS = 5;
