import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { TableGenerationConfig } from '../interfaces/GeneratorTypes';
import { BaseTableGenerator } from './BaseTableGenerator';
import { ActivityRepSummaryTableGenerator } from './ActivityRepSummaryTableGenerator';
import { ActivityCrossRepTableGenerator } from './ActivityCrossRepTableGenerator';
import { EntityRepTableGenerator } from './EntityRepTableGenerator';
import { EntityCrossRepTableGenerator } from './EntityCrossRepTableGenerator';
import { ResourceRepSummaryTableGenerator } from './ResourceRepSummaryTableGenerator';
import { ResourceCrossRepTableGenerator } from './ResourceCrossRepTableGenerator';

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
            // Activity generators
            case 'activityRepSummary':
            case 'activity_rep_summary': // For backward compatibility
                return new ActivityRepSummaryTableGenerator(this.resultsReader, this.config);
                
            case 'activityCrossRep':
            case 'activity_cross_rep': // For backward compatibility
                return new ActivityCrossRepTableGenerator(this.resultsReader, this.config);
                
            // Entity generators
            case 'entityRep':
            case 'entity_rep': // For backward compatibility
                return new EntityRepTableGenerator(this.resultsReader, this.config);
                
            case 'entityCrossRep':
            case 'entity_cross_rep': // For backward compatibility
                return new EntityCrossRepTableGenerator(this.resultsReader, this.config);
                
            // Resource generators
            case 'resourceRepSummary':
            case 'resource_rep_summary': // For backward compatibility
                return new ResourceRepSummaryTableGenerator(this.resultsReader, this.config);
                
            case 'resourceCrossRep':
            case 'resource_cross_rep': // For backward compatibility
                return new ResourceCrossRepTableGenerator(this.resultsReader, this.config);
                
            // Handle legacy table types by mapping to new equivalents
            case 'activityUtilization':
            case 'activity_utilization':
                console.log('[TableGeneratorFactory] Mapping legacy activityUtilization to activityCrossRep');
                return new ActivityCrossRepTableGenerator(this.resultsReader, this.config);
                
            case 'entityState':
            case 'entity_state_rep_summary':
                console.log('[TableGeneratorFactory] Mapping legacy entityState to entityRep');
                return new EntityRepTableGenerator(this.resultsReader, this.config);
                
            case 'resourceUtilization':
            case 'resource_utilization':
                console.log('[TableGeneratorFactory] Mapping legacy resourceUtilization to resourceCrossRep');
                return new ResourceCrossRepTableGenerator(this.resultsReader, this.config);
                
            case 'entityStateCrossRepSummary':
            case 'entity_state_cross_rep_summary':
            case 'entityThroughputCrossRepSummary':
            case 'entity_throughput_cross_rep_summary':
                console.log('[TableGeneratorFactory] Mapping legacy entity summary to entityCrossRep');
                return new EntityCrossRepTableGenerator(this.resultsReader, this.config);
                
            default:
                console.warn(`[TableGeneratorFactory] Unknown table type: ${tableType}`);
                throw new Error(`Unknown table type: ${tableType}`);
        }
    }
}