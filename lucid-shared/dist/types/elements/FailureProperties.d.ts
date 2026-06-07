import { Duration } from "./Duration";
import { FailureClockMode } from "./FailureClockMode";
/**
 * Failure (MTBF/MTTR) configuration for activities.
 * Mirrors Python quodsim/model_definition/failure_properties.py
 */
export declare class FailureProperties {
    enabled: boolean;
    mtbfDuration: Duration | null;
    mttrDuration: Duration | null;
    failureClockMode: FailureClockMode;
    repairResourceRequirementId: string;
    constructor(options?: {
        enabled?: boolean;
        mtbfDuration?: Duration | null;
        mttrDuration?: Duration | null;
        failureClockMode?: FailureClockMode;
        repairResourceRequirementId?: string;
    });
    /**
     * Validate failure properties configuration.
     * When enabled, both MTBF and MTTR durations must be provided.
     */
    validate(): void;
    /**
     * Convert to plain object for JSON serialization.
     * Produces camelCase keys matching Python FailureProperties.from_dict() expectations.
     */
    toJSON(): any;
    /**
     * Create from plain object (e.g., from JSON or Lucid storage).
     */
    static fromJSON(data: any): FailureProperties;
}
//# sourceMappingURL=FailureProperties.d.ts.map