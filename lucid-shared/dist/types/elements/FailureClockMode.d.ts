/**
 * Determines how the MTBF (Mean Time Between Failures) clock advances.
 * Mirrors Python quodsim/enums/failure_clock_mode.py
 */
export declare enum FailureClockMode {
    /** MTBF clock advances continuously (wall clock time) */
    WALL_CLOCK = "WALL_CLOCK",
    /** MTBF clock advances only during active processing time */
    ACTIVE_TIME = "ACTIVE_TIME"
}
//# sourceMappingURL=FailureClockMode.d.ts.map