/**
 * Interface for Activity Timing data
 * Defines timing-related metrics for activities (durations, delays, etc.)
 */
export interface ActivityTimingData {
    Id: string;
    Name: string;
    cycle_time_mean: number;
    cycle_time_median: number;
    cycle_time_cv: number;
    cycle_time_std_dev: number;
    service_time_mean: number;
    service_time_median: number;
    service_time_cv: number;
    service_time_std_dev: number;
    waiting_time_mean: number;
    waiting_time_median: number;
    waiting_time_cv: number;
    waiting_time_std_dev: number;
    blocked_time_mean: number;
    blocked_time_median: number;
    blocked_time_cv: number;
    blocked_time_std_dev: number;
}
