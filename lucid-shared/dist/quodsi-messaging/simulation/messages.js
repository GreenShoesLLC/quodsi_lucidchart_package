"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationStatus = void 0;
/**
 * Simulation status enum
 */
var SimulationStatus;
(function (SimulationStatus) {
    SimulationStatus["IDLE"] = "idle";
    SimulationStatus["QUEUED"] = "queued";
    SimulationStatus["PROCESSING"] = "processing";
    SimulationStatus["VALIDATING"] = "validating";
    SimulationStatus["RUNNING"] = "running";
    SimulationStatus["COMPLETED"] = "completed";
    SimulationStatus["FAILED"] = "failed";
    SimulationStatus["ERROR"] = "error";
    SimulationStatus["CANCELLED"] = "cancelled";
})(SimulationStatus = exports.SimulationStatus || (exports.SimulationStatus = {}));
