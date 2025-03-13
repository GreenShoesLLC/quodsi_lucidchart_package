import { BaseTableGenerator } from './BaseTableGenerator';
import { SchemaMapping } from '../interfaces/GeneratorTypes';
import { ResourceUtilizationSchema } from '../../data_sources/simulation_results/schemas';
import { ResourceUtilization } from '../../data_sources/simulation_results/models';

/**
 * Generator for resource utilization tables
 */
export class ResourceUtilizationTableGenerator extends BaseTableGenerator {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        return 'resourceUtilization';
    }
    
    /**
     * Gets the schema mapping for resource utilization tables
     * @returns Schema mapping object
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ResourceUtilizationSchema,
            identifierFields: ['resource_id', 'resource_name'],
            percentageFields: ['utilization_mean', 'utilization_min', 'utilization_max', 'bottleneck_frequency'],
            priorityFields: [
                'resource_name',
                'utilization_mean',
                'utilization_max',
                'utilization_min',
                'utilization_std_dev',
                'bottleneck_frequency'
            ]
        };
    }
    
    /**
     * Gets resource utilization data
     * @returns Promise resolving with array of resource utilization data
     */
    async getData(): Promise<ResourceUtilization[]> {
        return this.resultsReader.getResourceUtilizationData();
    }
    
    /**
     * Gets the default title for resource utilization tables
     * @returns Default title string
     */
    getDefaultTitle(): string {
        return 'Resource Utilization Summary';
    }
}
