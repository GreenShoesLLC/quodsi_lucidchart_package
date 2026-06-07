"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureClockMode = void 0;
/**
 * Determines how the MTBF (Mean Time Between Failures) clock advances.
 * Mirrors Python quodsim/enums/failure_clock_mode.py
 */
var FailureClockMode;
(function (FailureClockMode) {
    /** MTBF clock advances continuously (wall clock time) */
    FailureClockMode["WALL_CLOCK"] = "WALL_CLOCK";
    /** MTBF clock advances only during active processing time */
    FailureClockMode["ACTIVE_TIME"] = "ACTIVE_TIME";
})(FailureClockMode = exports.FailureClockMode || (exports.FailureClockMode = {}));
