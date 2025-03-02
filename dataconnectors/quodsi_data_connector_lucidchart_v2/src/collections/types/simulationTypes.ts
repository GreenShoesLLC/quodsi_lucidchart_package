// ActivityUtilizationData interface (existing)
export interface ActivityUtilizationData {
    Id: string;
    Name: string;
    utilization_mean: number;
    utilization_max: number;
    utilization_std_dev: number;
    capacity_mean: number;
    capacity_max: number;
    capacity_std_dev: number;
    contents_mean: number;
    contents_max: number;
    contents_std_dev: number;
    queue_length_mean: number;
    queue_length_max: number;
    queue_length_std_dev: number;
}

// ActivityRepSummaryData interface
export interface ActivityRepSummaryData {
    rep: number;
    activity_id: string;
    capacity: number;
    total_available_clock: number;
    total_arrivals: number;
    total_requests: number;
    total_captures: number;
    total_releases: number;
    total_time_in_capture: number;
    total_time_blocked: number;
    total_time_waiting: number;
    average_contents: number;
    maximum_contents: number;
    current_contents: number;
    utilization_percentage: number;
    throughput_rate: number;
    average_time_per_entry: number;
    average_queue_length: number;
    input_buffer_utilization: number;
    output_buffer_utilization: number;
    input_buffer_queue_time: number;
    output_buffer_queue_time: number;
    min_service_time: number;
    max_service_time: number;
    avg_service_time: number;
    service_time_variance: number;
    total_time_blocked_upstream: number;
    total_time_blocked_downstream: number;
    blocking_frequency: number;
    resource_starvation_time: number;
    resource_conflict_count: number;
    operational_efficiency: number;
    cycle_time_efficiency: number;
    first_time_through: number;
}

// ActivityTimingData interface
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

// EntityStateRepSummaryData interface
export interface EntityStateRepSummaryData {
    rep: number;
    entity_type: string;
    count: number;
    avg_time_in_system: number;
    avg_time_waiting: number;
    avg_time_blocked: number;
    avg_time_in_operation: number;
    avg_time_connecting: number;
    percent_waiting: number;
    percent_blocked: number;
    percent_operation: number;
    percent_connecting: number;
}

// EntityThroughputRepSummaryData interface
export interface EntityThroughputRepSummaryData {
    rep: number;
    entity_type: string;
    count: number;
    completed_count: number;
    in_progress_count: number;
    first_exit: number;
    last_exit: number;
    avg_interval: number;
    min_interval: number;
    max_interval: number;
    throughput_rate: number;
}

// ResourceRepSummaryData interface
export interface ResourceRepSummaryData {
    rep: number;
    resource_id: string;
    total_requests: number;
    total_captures: number;
    total_releases: number;
    avg_capture_time: number;
    utilization_rate: number;
    total_time_waiting: number;
    avg_queue_time: number;
    max_queue_length: number;
    avg_contents: number;
}

// CustomMetricsData interface
export interface CustomMetricsData {
    Id: string;
    Name: string;
    utilization_mean: number;
    utilization_std_dev: number;
    throughput_mean: number;
    throughput_std_dev: number;
    bottleneck_frequency: number;
}

// CompleteActivityMetricsData interface
// This is a large interface with many statistical metrics
export interface CompleteActivityMetricsData {
    Id: string;
    Name: string;
    
    // Arrivals metrics
    arrivals_median: number;
    arrivals_iqr: number;
    arrivals_q1: number;
    arrivals_std_dev: number;
    arrivals_q3: number;
    arrivals_mean: number;
    arrivals_cv: number;
    arrivals_sample_size: number;
    arrivals_min: number;
    arrivals_max: number;
    
    // Available Time metrics
    available_time_median: number;
    available_time_iqr: number;
    available_time_q1: number;
    available_time_std_dev: number;
    available_time_q3: number;
    available_time_mean: number;
    available_time_cv: number;
    available_time_sample_size: number;
    available_time_min: number;
    available_time_max: number;
    
    // Blocked Time metrics
    blocked_time_median: number;
    blocked_time_iqr: number;
    blocked_time_q1: number;
    blocked_time_std_dev: number;
    blocked_time_q3: number;
    blocked_time_mean: number;
    blocked_time_cv: number;
    blocked_time_sample_size: number;
    blocked_time_min: number;
    blocked_time_max: number;
    
    // Capacity metrics
    capacity_median: number;
    capacity_iqr: number;
    capacity_q1: number;
    capacity_std_dev: number;
    capacity_q3: number;
    capacity_mean: number;
    capacity_cv: number;
    capacity_sample_size: number;
    capacity_min: number;
    capacity_max: number;
    
    // Capture Time metrics
    capture_time_median: number;
    capture_time_iqr: number;
    capture_time_q1: number;
    capture_time_std_dev: number;
    capture_time_q3: number;
    capture_time_mean: number;
    capture_time_cv: number;
    capture_time_sample_size: number;
    capture_time_min: number;
    capture_time_max: number;
    
    // Captures metrics
    captures_median: number;
    captures_iqr: number;
    captures_q1: number;
    captures_std_dev: number;
    captures_q3: number;
    captures_mean: number;
    captures_cv: number;
    captures_sample_size: number;
    captures_min: number;
    captures_max: number;
    
    // Contents metrics
    contents_median: number;
    contents_iqr: number;
    contents_q1: number;
    contents_std_dev: number;
    contents_q3: number;
    contents_mean: number;
    contents_cv: number;
    contents_sample_size: number;
    contents_min: number;
    contents_max: number;
    
    // Cycle Time metrics
    cycle_time_median: number;
    cycle_time_iqr: number;
    cycle_time_q1: number;
    cycle_time_std_dev: number;
    cycle_time_q3: number;
    cycle_time_mean: number;
    cycle_time_cv: number;
    cycle_time_sample_size: number;
    cycle_time_min: number;
    cycle_time_max: number;
    
    // Cycle Time Efficiency metrics
    cycle_time_efficiency_median: number;
    cycle_time_efficiency_iqr: number;
    cycle_time_efficiency_q1: number;
    cycle_time_efficiency_std_dev: number;
    cycle_time_efficiency_q3: number;
    cycle_time_efficiency_mean: number;
    cycle_time_efficiency_cv: number;
    cycle_time_efficiency_sample_size: number;
    cycle_time_efficiency_min: number;
    cycle_time_efficiency_max: number;
    
    // Downstream Blocking metrics
    downstream_blocking_median: number;
    downstream_blocking_iqr: number;
    downstream_blocking_q1: number;
    downstream_blocking_std_dev: number;
    downstream_blocking_q3: number;
    downstream_blocking_mean: number;
    downstream_blocking_cv: number;
    downstream_blocking_sample_size: number;
    downstream_blocking_min: number;
    downstream_blocking_max: number;
    
    // First Time Through metrics
    first_time_through_median: number;
    first_time_through_iqr: number;
    first_time_through_q1: number;
    first_time_through_std_dev: number;
    first_time_through_q3: number;
    first_time_through_mean: number;
    first_time_through_cv: number;
    first_time_through_sample_size: number;
    first_time_through_min: number;
    first_time_through_max: number;
    
    // Input Buffer Stats metrics
    input_buffer_stats_median: number;
    input_buffer_stats_iqr: number;
    input_buffer_stats_q1: number;
    input_buffer_stats_std_dev: number;
    input_buffer_stats_q3: number;
    input_buffer_stats_mean: number;
    input_buffer_stats_cv: number;
    input_buffer_stats_sample_size: number;
    input_buffer_stats_min: number;
    input_buffer_stats_max: number;
    
    // Max Contents metrics
    max_contents_median: number;
    max_contents_iqr: number;
    max_contents_q1: number;
    max_contents_std_dev: number;
    max_contents_q3: number;
    max_contents_mean: number;
    max_contents_cv: number;
    max_contents_sample_size: number;
    max_contents_min: number;
    max_contents_max: number;
    
    // Operational Efficiency metrics
    operational_efficiency_median: number;
    operational_efficiency_iqr: number;
    operational_efficiency_q1: number;
    operational_efficiency_std_dev: number;
    operational_efficiency_q3: number;
    operational_efficiency_mean: number;
    operational_efficiency_cv: number;
    operational_efficiency_sample_size: number;
    operational_efficiency_min: number;
    operational_efficiency_max: number;
    
    // Output Buffer Stats metrics
    output_buffer_stats_median: number;
    output_buffer_stats_iqr: number;
    output_buffer_stats_q1: number;
    output_buffer_stats_std_dev: number;
    output_buffer_stats_q3: number;
    output_buffer_stats_mean: number;
    output_buffer_stats_cv: number;
    output_buffer_stats_sample_size: number;
    output_buffer_stats_min: number;
    output_buffer_stats_max: number;
    
    // Queue Length metrics
    queue_length_median: number;
    queue_length_iqr: number;
    queue_length_q1: number;
    queue_length_std_dev: number;
    queue_length_q3: number;
    queue_length_mean: number;
    queue_length_cv: number;
    queue_length_sample_size: number;
    queue_length_min: number;
    queue_length_max: number;
    
    // Releases metrics
    releases_median: number;
    releases_iqr: number;
    releases_q1: number;
    releases_std_dev: number;
    releases_q3: number;
    releases_mean: number;
    releases_cv: number;
    releases_sample_size: number;
    releases_min: number;
    releases_max: number;
    
    // Resource Conflicts metrics
    resource_conflicts_median: number;
    resource_conflicts_iqr: number;
    resource_conflicts_q1: number;
    resource_conflicts_std_dev: number;
    resource_conflicts_q3: number;
    resource_conflicts_mean: number;
    resource_conflicts_cv: number;
    resource_conflicts_sample_size: number;
    resource_conflicts_min: number;
    resource_conflicts_max: number;
    
    // Resource Starvation metrics
    resource_starvation_median: number;
    resource_starvation_iqr: number;
    resource_starvation_q1: number;
    resource_starvation_std_dev: number;
    resource_starvation_q3: number;
    resource_starvation_mean: number;
    resource_starvation_cv: number;
    resource_starvation_sample_size: number;
    resource_starvation_min: number;
    resource_starvation_max: number;
    
    // Service Time metrics
    service_time_median: number;
    service_time_iqr: number;
    service_time_q1: number;
    service_time_std_dev: number;
    service_time_q3: number;
    service_time_mean: number;
    service_time_cv: number;
    service_time_sample_size: number;
    service_time_min: number;
    service_time_max: number;
    
    // Service Time Variance metrics
    service_time_variance_median: number;
    service_time_variance_iqr: number;
    service_time_variance_q1: number;
    service_time_variance_std_dev: number;
    service_time_variance_q3: number;
    service_time_variance_mean: number;
    service_time_variance_cv: number;
    service_time_variance_sample_size: number;
    service_time_variance_min: number;
    service_time_variance_max: number;
    
    // Throughput metrics
    throughput_median: number;
    throughput_iqr: number;
    throughput_q1: number;
    throughput_std_dev: number;
    throughput_q3: number;
    throughput_mean: number;
    throughput_cv: number;
    throughput_sample_size: number;
    throughput_min: number;
    throughput_max: number;
    
    // Upstream Blocking metrics
    upstream_blocking_median: number;
    upstream_blocking_iqr: number;
    upstream_blocking_q1: number;
    upstream_blocking_std_dev: number;
    upstream_blocking_q3: number;
    upstream_blocking_mean: number;
    upstream_blocking_cv: number;
    upstream_blocking_sample_size: number;
    upstream_blocking_min: number;
    upstream_blocking_max: number;
    
    // Utilization metrics
    utilization_median: number;
    utilization_iqr: number;
    utilization_q1: number;
    utilization_std_dev: number;
    utilization_q3: number;
    utilization_mean: number;
    utilization_cv: number;
    utilization_sample_size: number;
    utilization_min: number;
    utilization_max: number;
    
    // Waiting Time metrics
    waiting_time_median: number;
    waiting_time_iqr: number;
    waiting_time_q1: number;
    waiting_time_std_dev: number;
    waiting_time_q3: number;
    waiting_time_mean: number;
    waiting_time_cv: number;
    waiting_time_sample_size: number;
    waiting_time_min: number;
    waiting_time_max: number;
    
    // Summary statistics
    average_cycle_time: number;
    average_utilization: number;
    bottleneck_frequency: number;
    capacity_loss_breakdown: string;
    improvement_opportunities: string;
    peak_utilization: number;
    total_activities: number;
    total_throughput: number;
}