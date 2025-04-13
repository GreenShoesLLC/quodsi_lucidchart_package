import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { ResourceCrossRep } from '../../data_sources/simulation_results/models';
import { ResourceCrossRepSchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Resource Cross Replication tables
 */
export class ResourceCrossRepTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'resourceCrossRep';
    }
    
    /**
     * Returns the schema mapping for resource cross replication data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ResourceCrossRepSchema,
            identifierFields: ['id', 'resource_id', 'resource_name'],
            percentageFields: ['utilization_mean', 'utilization_min', 'utilization_max'],
            priorityFields: [
                'resource_id',
                'resource_name',
                'scenario_name',
                'utilization_mean',
                'utilization_min',
                'utilization_max',
                'utilization_std_dev',
                'bottleneck_frequency'
            ]
        };
    }
    
    /**
     * Retrieves resource cross replication data from the results reader
     */
    async getData(): Promise<ResourceCrossRep[]> {
        return this.resultsReader.getResourceCrossRepData();
    }
    
    /**
     * Returns the default title for resource cross replication tables
     */
    getDefaultTitle(): string {
        return 'Resource Cross Replication Summary';
    }
}