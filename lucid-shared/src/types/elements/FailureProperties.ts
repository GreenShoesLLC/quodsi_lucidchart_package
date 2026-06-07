import { Duration } from "./Duration";
import { FailureClockMode } from "./FailureClockMode";

/**
 * Failure (MTBF/MTTR) configuration for activities.
 * Mirrors Python quodsim/model_definition/failure_properties.py
 */
export class FailureProperties {
    enabled: boolean = false;
    mtbfDuration: Duration | null = null;
    mttrDuration: Duration | null = null;
    failureClockMode: FailureClockMode = FailureClockMode.WALL_CLOCK;
    repairResourceRequirementId: string = "";

    constructor(options?: {
        enabled?: boolean;
        mtbfDuration?: Duration | null;
        mttrDuration?: Duration | null;
        failureClockMode?: FailureClockMode;
        repairResourceRequirementId?: string;
    }) {
        if (options) {
            this.enabled = options.enabled ?? false;
            this.mtbfDuration = options.mtbfDuration ?? null;
            this.mttrDuration = options.mttrDuration ?? null;
            this.failureClockMode = options.failureClockMode ?? FailureClockMode.WALL_CLOCK;
            this.repairResourceRequirementId = options.repairResourceRequirementId ?? "";
        }
    }

    /**
     * Validate failure properties configuration.
     * When enabled, both MTBF and MTTR durations must be provided.
     */
    validate(): void {
        if (this.enabled) {
            if (!this.mtbfDuration) {
                throw new Error("mtbfDuration is required when failure is enabled");
            }
            if (!this.mttrDuration) {
                throw new Error("mttrDuration is required when failure is enabled");
            }
        }
    }

    /**
     * Convert to plain object for JSON serialization.
     * Produces camelCase keys matching Python FailureProperties.from_dict() expectations.
     */
    toJSON(): any {
        const result: any = {
            enabled: this.enabled,
            failureClockMode: this.failureClockMode,
            repairResourceRequirementId: this.repairResourceRequirementId
        };

        if (this.mtbfDuration) {
            result.mtbfDuration = {
                durationPeriodUnit: this.mtbfDuration.durationPeriodUnit,
                distribution: this.mtbfDuration.distribution
            };
        } else {
            result.mtbfDuration = null;
        }

        if (this.mttrDuration) {
            result.mttrDuration = {
                durationPeriodUnit: this.mttrDuration.durationPeriodUnit,
                distribution: this.mttrDuration.distribution
            };
        } else {
            result.mttrDuration = null;
        }

        return result;
    }

    /**
     * Create from plain object (e.g., from JSON or Lucid storage).
     */
    static fromJSON(data: any): FailureProperties {
        return new FailureProperties({
            enabled: data.enabled ?? false,
            mtbfDuration: data.mtbfDuration
                ? new Duration(data.mtbfDuration.durationPeriodUnit, data.mtbfDuration.distribution)
                : null,
            mttrDuration: data.mttrDuration
                ? new Duration(data.mttrDuration.durationPeriodUnit, data.mttrDuration.distribution)
                : null,
            failureClockMode: data.failureClockMode ?? FailureClockMode.WALL_CLOCK,
            repairResourceRequirementId: data.repairResourceRequirementId ?? ""
        });
    }
}
