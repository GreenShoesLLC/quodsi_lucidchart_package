"use strict";
/**
 * System-wide limits and constraints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SIMULATION_RUNS = void 0;
/**
 * Maximum number of simulation runs allowed per document
 *
 * This limit ensures:
 * - Reasonable Azure Storage usage per document
 * - Good UX (not overwhelming the run list)
 * - Predictable billing and resource consumption
 */
exports.MAX_SIMULATION_RUNS = 5;
