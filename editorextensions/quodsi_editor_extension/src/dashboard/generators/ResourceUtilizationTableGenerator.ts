import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { ResourceUtilization } from '../../data_sources/simulation_results/models';
import { ResourceUtilizationSchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Resource Utilization tables
 */
export class ResourceUtilizationTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'resource_utilization';
    }
    
    /**
     * Returns the schema mapping for resource utilization data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ResourceUtilizationSchema,
            identifierFields: ['Id', 'Name'],
            percentageFields: ['utilization_rate_mean', 'utilization_rate_max'],
            priorityFields: [
                'Name',
                'utilization_rate_mean',
                'utilization_rate_max',
                'contents_mean',
                'contents_max'
            ]
        };
    }
    
    /**
     * Retrieves resource utilization data from the results reader
     */
    async getData(): Promise<ResourceUtilization[]> {
        return this.resultsReader.getResourceUtilizationData();
    }
    
    /**
     * Returns the default title for resource utilization tables
     */
    getDefaultTitle(): string {
        return 'Resource Utilization';
    }
}