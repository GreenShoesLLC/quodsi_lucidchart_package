import { PageProxy, TableBlockProxy, EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsReader } from '../data_sources/simulation_results/SimulationResultsReader';
import { TableGenerationConfig } from './interfaces/GeneratorTypes';
import { TableGeneratorFactory } from './generators/TableGeneratorFactory';

/**
 * Dynamic generator class for creating tables from simulation results
 * that uses schema information to build tables.
 * 
 * This is a wrapper around the specialized table generators to maintain
 * backward compatibility with existing code.
 */
export class DynamicSimulationResultsTableGenerator {
    private factory: TableGeneratorFactory;
    
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        this.factory = new TableGeneratorFactory(resultsReader, config);
    }
    
    /**
     * Creates a table for activity utilization data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createActivityUtilizationTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('activityUtilization');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for activity replication summary data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createActivityRepSummaryTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('activityRepSummary');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for activity timing data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createActivityTimingTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('activityTiming');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for entity throughput data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createEntityThroughputTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('entityThroughput');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for entity state summary data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createEntityStateTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('entityState');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for resource utilization data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createResourceUtilizationTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('resourceUtilization');
        return generator.createTable(page, client, config);
    }
}