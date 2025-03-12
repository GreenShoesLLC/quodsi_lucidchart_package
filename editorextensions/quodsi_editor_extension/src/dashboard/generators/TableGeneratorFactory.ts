import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { TableGenerationConfig } from '../interfaces/GeneratorTypes';
import { BaseTableGenerator } from './BaseTableGenerator';
import { ActivityUtilizationTableGenerator } from './ActivityUtilizationTableGenerator';
import { ActivityRepSummaryTableGenerator } from './ActivityRepSummaryTableGenerator';
import { ActivityTimingTableGenerator } from './ActivityTimingTableGenerator';
import { EntityStateTableGenerator } from './EntityStateTableGenerator';
import { EntityThroughputTableGenerator } from './EntityThroughputTableGenerator';
import { ResourceUtilizationTableGenerator } from './ResourceUtilizationTableGenerator';

/**
 * Factory class for creating table generators based on table type
 */
export class TableGeneratorFactory {
    private resultsReader: SimulationResultsReader;
    private config: TableGenerationConfig;
    
    /**
     * Creates a new TableGeneratorFactory
     * @param resultsReader The simulation results reader to use for data access
     * @param config Optional configuration to apply to all created generators
     */
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        this.resultsReader = resultsReader;
        this.config = config || {};
    }
    
    /**
     * Gets a table generator for the specified table type
     * @param tableType The type of table to generate
     * @returns An instance of the appropriate table generator
     * @throws Error if the table type is not supported
     */
    getGenerator(tableType: string): BaseTableGenerator {
        switch (tableType) {
            case 'activityUtilization':
            case 'activity_utilization': // For backward compatibility
                return new ActivityUtilizationTableGenerator(this.resultsReader, this.config);
                
            case 'activityRepSummary':
            case 'activity_rep_summary': // For backward compatibility
                return new ActivityRepSummaryTableGenerator(this.resultsReader, this.config);
                
            case 'activityTiming':
            case 'activity_timing': // For backward compatibility
                return new ActivityTimingTableGenerator(this.resultsReader, this.config);
                
            case 'entityState':
            case 'entity_state_rep_summary': // For backward compatibility
                return new EntityStateTableGenerator(this.resultsReader, this.config);
                
            case 'entityThroughput':
            case 'entity_throughput_rep_summary': // For backward compatibility
                return new EntityThroughputTableGenerator(this.resultsReader, this.config);
                
            case 'resourceUtilization':
            case 'resource_utilization': // For backward compatibility
                return new ResourceUtilizationTableGenerator(this.resultsReader, this.config);
                
            default:
                throw new Error(`Unknown table type: ${tableType}`);
        }
    }
}