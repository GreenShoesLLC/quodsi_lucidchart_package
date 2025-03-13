import { BaseTableGenerator } from './BaseTableGenerator';
import { SchemaMapping } from '../interfaces/GeneratorTypes';
import { ResourceRepSummarySchema } from '../../data_sources/simulation_results/schemas';
import { ResourceRepSummary } from '../../data_sources/simulation_results/models';

/**
 * Generator for resource replication summary tables
 */
export class ResourceRepSummaryTableGenerator extends BaseTableGenerator {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        return 'resourceRepSummary';
    }
    
    /**
     * Gets the schema mapping for resource replication summary tables
     * @returns Schema mapping object
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ResourceRepSummarySchema,
            identifierFields: ['resource_id', 'resource_name', 'rep'],
            percentageFields: ['average_utilization', 'peak_utilization', 'current_utilization'],
            priorityFields: [
                'resource_name',
                'rep',
                'capacity',
                'total_requests',
                'times_acquired',
                'average_utilization',
                'peak_utilization',
                'average_wait_time',
                'max_queue_length',
                'average_queue_length'
            ]
        };
    }
    
    /**
     * Gets resource replication summary data
     * @returns Promise resolving with array of resource replication summary data
     */
    async getData(): Promise<ResourceRepSummary[]> {
        return this.resultsReader.getResourceRepSummaryData();
    }
    
    /**
     * Gets the default title for resource replication summary tables
     * @returns Default title string
     */
    getDefaultTitle(): string {
        return 'Resource Utilization by Replication';
    }
}
