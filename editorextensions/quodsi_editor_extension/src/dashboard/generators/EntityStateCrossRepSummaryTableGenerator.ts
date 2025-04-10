import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { EntityStateCrossRepSummary } from '../../data_sources/simulation_results/models';
import { EntityStateCrossRepSummarySchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Entity State Cross Replication Summary tables
 */
export class EntityStateCrossRepSummaryTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'entityStateCrossRepSummary';
    }
    
    /**
     * Returns the schema mapping for entity state cross replication data
     */
    getSchemaMapping(): SchemaMapping {
        console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableGenerator.getSchemaMapping called');
        return {
            schema: EntityStateCrossRepSummarySchema,
            identifierFields: ['id', 'entity_id', 'entity_name'],
            percentageFields: [
                'percent_waiting_mean',
                'percent_waiting_std_dev',
                'percent_blocked_mean',
                'percent_blocked_std_dev',
                'percent_operation_mean',
                'percent_operation_std_dev',
                'percent_connecting_mean',
                'percent_connecting_std_dev'
            ],
            // Reduce the number of fields to focus on the most important ones
            // This helps make the table more readable and less likely to have issues
            priorityFields: [
                'entity_name',  // Keep entity name as the primary identifier
                'scenario_name', // Keep scenario name for context
                'count_mean',    // These are the core metrics we want to display
                'time_in_system_mean',
                'time_waiting_mean',
                'time_blocked_mean',
                'time_in_operation_mean',
                'percent_waiting_mean',
                'percent_blocked_mean',
                'percent_operation_mean'
            ]
        };
    }
    
    /**
     * Retrieves entity state cross replication data from the results reader
     */
    async getData(): Promise<EntityStateCrossRepSummary[]> {
        console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableGenerator.getData() called');
        console.log('[EntityStateCrossRepSummary] About to call resultsReader.getEntityStateCrossRepSummaryData()');
        const data = await this.resultsReader.getEntityStateCrossRepSummaryData();
        console.log('[EntityStateCrossRepSummary] Got data from resultsReader, data length:', data.length);

        
        // Log all data objects to see what's there
        console.log('[EntityStateCrossRepSummary] All data items:');
        data.forEach((item, index) => {
            console.log(`[EntityStateCrossRepSummary] Item ${index}:`, JSON.stringify(item));
            // Check for any key fields that might be missing
            console.log(`[EntityStateCrossRepSummary] Item ${index} key fields:`,
                'entity_name=', item.entity_name,
                'entity_id=', item.entity_id,
                'count_mean=', item.count_mean,
                'time_in_system_mean=', item.time_in_system_mean);
        });
        if (data.length > 0) {
            // Verify that first data item has expected fields
            const firstItem = data[0];
            console.log('[EntityStateCrossRepSummary] First item keys:', Object.keys(firstItem));
            console.log('[EntityStateCrossRepSummary] Checking specific field properties:', 
                'entity_name type:', typeof firstItem.entity_name,
                'count_mean type:', typeof firstItem.count_mean);
            console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableGenerator first item:', JSON.stringify(data[0]));
        }
        console.log('[EntityStateCrossRepSummary] Returning data from EntityStateCrossRepSummaryTableGenerator.getData()');
        return data;
    }
    
    /**
     * Returns the default title for entity state cross replication tables
     */
    getDefaultTitle(): string {
        return 'Entity State Cross Replication Analysis';
    }
}