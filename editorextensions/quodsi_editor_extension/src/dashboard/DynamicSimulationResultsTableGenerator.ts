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
    public factory: TableGeneratorFactory;
    
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        this.factory = new TableGeneratorFactory(resultsReader, config);
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
     * Creates a table for activity cross replication data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createActivityCrossRepTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('activityCrossRep');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for entity replication data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createEntityRepTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('entityRep');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for entity cross replication data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createEntityCrossRepTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('entityCrossRep');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for resource replication summary data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createResourceRepSummaryTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('resourceRepSummary');
        return generator.createTable(page, client, config);
    }
    
    /**
     * Creates a table for resource cross replication data
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createResourceCrossRepTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        const generator = this.factory.getGenerator('resourceCrossRep');
        return generator.createTable(page, client, config);
    }
}