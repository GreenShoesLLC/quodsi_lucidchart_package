// schemas/entityRepSchema.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const EntityRepSchema: SchemaDefinition = {
    fields: [
        // Identifiers
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "entity_id", type: ScalarFieldTypeEnum.STRING },
        { name: "entity_name", type: ScalarFieldTypeEnum.STRING },
        { name: "rep", type: ScalarFieldTypeEnum.NUMBER },  // Replication number
        
        // Core metrics
        { name: "entity_count", type: ScalarFieldTypeEnum.NUMBER },  // Total entity count
        { name: "completed_count", type: ScalarFieldTypeEnum.NUMBER },  // Number of entities that completed processing
        { name: "in_progress_count", type: ScalarFieldTypeEnum.NUMBER },  // Number of entities still in the system
        { name: "throughput_rate", type: ScalarFieldTypeEnum.NUMBER },  // Entities per time unit
        
        // Exit time metrics
        { name: "first_exit", type: ScalarFieldTypeEnum.NUMBER },  // Time of first entity exit
        { name: "last_exit", type: ScalarFieldTypeEnum.NUMBER },  // Time of last entity exit
        
        // Interval metrics
        { name: "avg_interval", type: ScalarFieldTypeEnum.NUMBER },  // Average time between entity exits
        { name: "min_interval", type: ScalarFieldTypeEnum.NUMBER },  // Minimum time between entity exits
        { name: "max_interval", type: ScalarFieldTypeEnum.NUMBER },  // Maximum time between entity exits
        
        // Time metrics
        { name: "avg_time_in_system", type: ScalarFieldTypeEnum.NUMBER },  // Average total time in system
        { name: "avg_time_waiting", type: ScalarFieldTypeEnum.NUMBER },  // Average time spent waiting
        { name: "avg_time_blocked", type: ScalarFieldTypeEnum.NUMBER },  // Average time spent blocked
        { name: "avg_time_in_operation", type: ScalarFieldTypeEnum.NUMBER },  // Average time in operation
        { name: "avg_time_connecting", type: ScalarFieldTypeEnum.NUMBER },  // Average time in connectors
        
        // Percentage metrics
        { name: "percent_waiting", type: ScalarFieldTypeEnum.NUMBER },  // Percent of time spent waiting
        { name: "percent_blocked", type: ScalarFieldTypeEnum.NUMBER },  // Percent of time spent blocked
        { name: "percent_operation", type: ScalarFieldTypeEnum.NUMBER },  // Percent of time in operation
        { name: "percent_connecting", type: ScalarFieldTypeEnum.NUMBER },  // Percent of time in connectors
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'entity_id': 'Entity ID',
        'entity_name': 'Entity Name',
        'rep': 'Replication',
        
        // Core metrics
        'entity_count': 'Entity Count',
        'completed_count': 'Completed Count',
        'in_progress_count': 'In Progress Count',
        'throughput_rate': 'Throughput Rate',
        
        // Exit time metrics
        'first_exit': 'First Exit Time',
        'last_exit': 'Last Exit Time',
        
        // Interval metrics
        'avg_interval': 'Average Interval',
        'min_interval': 'Minimum Interval',
        'max_interval': 'Maximum Interval',
        
        // Time metrics
        'avg_time_in_system': 'Avg Time in System',
        'avg_time_waiting': 'Avg Time Waiting',
        'avg_time_blocked': 'Avg Time Blocked',
        'avg_time_in_operation': 'Avg Time in Operation',
        'avg_time_connecting': 'Avg Time Connecting',
        
        // Percentage metrics
        'percent_waiting': '% Time Waiting',
        'percent_blocked': '% Time Blocked',
        'percent_operation': '% Time in Operation',
        'percent_connecting': '% Time Connecting'
    }
};