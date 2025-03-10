// schemas/activityRepSummary.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ActivityRepSummarySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING }, 
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "activity_id", type: ScalarFieldTypeEnum.STRING },
        { name: "activity_name", type: ScalarFieldTypeEnum.STRING },
        { name: "rep", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_available_clock", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_arrivals", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_requests", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_captures", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_releases", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_in_capture", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_blocked", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_waiting", type: ScalarFieldTypeEnum.NUMBER },
        { name: "average_contents", type: ScalarFieldTypeEnum.NUMBER },
        { name: "maximum_contents", type: ScalarFieldTypeEnum.NUMBER },
        { name: "current_contents", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_percentage", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate", type: ScalarFieldTypeEnum.NUMBER },
        { name: "average_time_per_entry", type: ScalarFieldTypeEnum.NUMBER },
        { name: "average_queue_length", type: ScalarFieldTypeEnum.NUMBER },
        { name: "input_buffer_utilization", type: ScalarFieldTypeEnum.NUMBER },
        { name: "output_buffer_utilization", type: ScalarFieldTypeEnum.NUMBER },
        { name: "input_buffer_queue_time", type: ScalarFieldTypeEnum.NUMBER },
        { name: "output_buffer_queue_time", type: ScalarFieldTypeEnum.NUMBER },
        { name: "min_service_time", type: ScalarFieldTypeEnum.NUMBER },
        { name: "max_service_time", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_service_time", type: ScalarFieldTypeEnum.NUMBER },
        { name: "service_time_variance", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_blocked_upstream", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_blocked_downstream", type: ScalarFieldTypeEnum.NUMBER },
        { name: "blocking_frequency", type: ScalarFieldTypeEnum.NUMBER },
        { name: "resource_starvation_time", type: ScalarFieldTypeEnum.NUMBER },
        { name: "resource_conflict_count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "operational_efficiency", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_efficiency", type: ScalarFieldTypeEnum.NUMBER },
        { name: "first_time_through", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID', 
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'activity_id': 'Activity ID',
        'activity_name': 'Activity Name',
        'rep': 'Replication',
        'capacity': 'Capacity',
        'total_available_clock': 'Total Available Clock',
        'total_arrivals': 'Total Arrivals',
        'total_requests': 'Total Requests',
        'total_captures': 'Total Captures',
        'total_releases': 'Total Releases',
        'total_time_in_capture': 'Total Time in Capture',
        'total_time_blocked': 'Total Time Blocked',
        'total_time_waiting': 'Total Time Waiting',
        'average_contents': 'Average Contents',
        'maximum_contents': 'Maximum Contents',
        'current_contents': 'Current Contents',
        'utilization_percentage': 'Utilization Percentage',
        'throughput_rate': 'Throughput Rate',
        'average_time_per_entry': 'Average Time Per Entry',
        'average_queue_length': 'Average Queue Length',
        'input_buffer_utilization': 'Input Buffer Utilization',
        'output_buffer_utilization': 'Output Buffer Utilization',
        'input_buffer_queue_time': 'Input Buffer Queue Time',
        'output_buffer_queue_time': 'Output Buffer Queue Time',
        'min_service_time': 'Min Service Time',
        'max_service_time': 'Max Service Time',
        'avg_service_time': 'Avg Service Time',
        'service_time_variance': 'Service Time Variance',
        'total_time_blocked_upstream': 'Total Time Blocked Upstream',
        'total_time_blocked_downstream': 'Total Time Blocked Downstream',
        'blocking_frequency': 'Blocking Frequency',
        'resource_starvation_time': 'Resource Starvation Time',
        'resource_conflict_count': 'Resource Conflict Count',
        'operational_efficiency': 'Operational Efficiency',
        'cycle_time_efficiency': 'Cycle Time Efficiency',
        'first_time_through': 'First Time Through'
    }
};