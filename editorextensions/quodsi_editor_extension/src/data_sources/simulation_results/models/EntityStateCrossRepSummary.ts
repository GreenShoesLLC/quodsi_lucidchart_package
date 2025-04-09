// Define the interface for the entity state cross rep summary data
export interface EntityStateCrossRepSummary {
    id: string;
    scenario_id: string;
    scenario_name: string;
    entity_id: string;
    entity_name: string;
    count_mean: number;
    count_median: number;
    count_std_dev: number;
    time_in_system_mean: number;
    time_in_system_median: number;
    time_in_system_std_dev: number;
    time_waiting_mean: number;
    time_waiting_median: number;
    time_waiting_std_dev: number;
    time_blocked_mean: number;
    time_blocked_median: number;
    time_blocked_std_dev: number;
    time_in_operation_mean: number;
    time_in_operation_median: number;
    time_in_operation_std_dev: number;
    time_connecting_mean: number;
    time_connecting_median: number;
    time_connecting_std_dev: number;
    percent_waiting_mean: number;
    percent_waiting_std_dev: number;
    percent_blocked_mean: number;
    percent_blocked_std_dev: number;
    percent_operation_mean: number;
    percent_operation_std_dev: number;
    percent_connecting_mean: number;
    percent_connecting_std_dev: number;
}

// Create a mapping function for converting raw data to typed objects
export function mapToEntityStateCrossRepSummary(fields: any): EntityStateCrossRepSummary {
    console.log('[EntityStateCrossRepSummary] mapToEntityStateCrossRepSummary raw fields:', fields);
    console.log('[EntityStateCrossRepSummary] mapToEntityStateCrossRepSummary entity_name:', fields.entity_name);
    console.log('[EntityStateCrossRepSummary] mapToEntityStateCrossRepSummary scenario_name:', fields.scenario_name);
    
    return {
        id: String(fields.id || ''),
        scenario_id: String(fields.scenario_id || ''),
        scenario_name: String(fields.scenario_name || ''),
        entity_id: String(fields.entity_id || ''),
        entity_name: String(fields.entity_name || ''),
        count_mean: Number(fields.count_mean || 0),
        count_median: Number(fields.count_median || 0),
        count_std_dev: Number(fields.count_std_dev || 0),
        time_in_system_mean: Number(fields.time_in_system_mean || 0),
        time_in_system_median: Number(fields.time_in_system_median || 0),
        time_in_system_std_dev: Number(fields.time_in_system_std_dev || 0),
        time_waiting_mean: Number(fields.time_waiting_mean || 0),
        time_waiting_median: Number(fields.time_waiting_median || 0),
        time_waiting_std_dev: Number(fields.time_waiting_std_dev || 0),
        time_blocked_mean: Number(fields.time_blocked_mean || 0),
        time_blocked_median: Number(fields.time_blocked_median || 0),
        time_blocked_std_dev: Number(fields.time_blocked_std_dev || 0),
        time_in_operation_mean: Number(fields.time_in_operation_mean || 0),
        time_in_operation_median: Number(fields.time_in_operation_median || 0),
        time_in_operation_std_dev: Number(fields.time_in_operation_std_dev || 0),
        time_connecting_mean: Number(fields.time_connecting_mean || 0),
        time_connecting_median: Number(fields.time_connecting_median || 0),
        time_connecting_std_dev: Number(fields.time_connecting_std_dev || 0),
        percent_waiting_mean: Number(fields.percent_waiting_mean || 0),
        percent_waiting_std_dev: Number(fields.percent_waiting_std_dev || 0),
        percent_blocked_mean: Number(fields.percent_blocked_mean || 0),
        percent_blocked_std_dev: Number(fields.percent_blocked_std_dev || 0),
        percent_operation_mean: Number(fields.percent_operation_mean || 0),
        percent_operation_std_dev: Number(fields.percent_operation_std_dev || 0),
        percent_connecting_mean: Number(fields.percent_connecting_mean || 0),
        percent_connecting_std_dev: Number(fields.percent_connecting_std_dev || 0)
    };
}
