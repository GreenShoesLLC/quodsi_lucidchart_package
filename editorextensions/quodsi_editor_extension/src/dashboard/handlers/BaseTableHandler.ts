// handlers/BaseTableHandler.ts

import { PageProxy, TableBlockProxy, EditorClient } from 'lucid-extension-sdk';
import { TableHandlerInterface, DashboardConfig, TableCreationResult } from '../interfaces/DashboardTypes';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { DynamicSimulationResultsTableGenerator, TableGenerationConfig } from '../../data_sources/simulation_results/DynamicSimulationResultsTableGenerator';
import { DashboardConfigManager } from '../utils/DashboardConfigManager';

/**
 * Base class for all table handlers
 * Implements common functionality and defines the interface
 */
export abstract class BaseTableHandler implements TableHandlerInterface {
    protected config: DashboardConfig;
    protected client: EditorClient;
    protected resultsReader: SimulationResultsReader;
    protected tableGenerator: DynamicSimulationResultsTableGenerator;
    
    /**
     * Creates a new table handler
     * @param client Editor client
     * @param resultsReader Simulation results reader
     * @param tableGenerator Table generator
     * @param config Dashboard configuration
     */
    constructor(
        client: EditorClient,
        resultsReader: SimulationResultsReader,
        tableGenerator: DynamicSimulationResultsTableGenerator,
        config: DashboardConfig
    ) {
        this.client = client;
        this.resultsReader = resultsReader;
        this.tableGenerator = tableGenerator;
        this.config = config;
    }
    
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    abstract getTableType(): string;
    
    /**
     * Gets the default title for this table type
     * @returns Default title
     */
    abstract getDefaultTitle(): string;
    
    /**
     * Creates a table at the specified position
     * @param page Page to add the table to
     * @param position Position coordinates
     * @returns Table creation result
     */
    abstract createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult>;
    
    /**
     * Checks if this table can be created (has data)
     * @returns True if the table can be created
     */
    abstract canCreateTable(): Promise<boolean>;
    
    /**
     * Gets the table configuration for this table type
     * @param position Position for the table
     * @returns Table generation configuration
     */
    protected getTableConfig(position: { x: number, y: number }): TableGenerationConfig {
        // Get base configuration for this table type
        const baseConfig = DashboardConfigManager.getTableTypeConfig(
            this.config, 
            this.getTableType()
        );
        
        // Set position and title
        return {
            ...baseConfig,
            position,
            title: this.getDefaultTitle()
        };
    }
    
    /**
     * Creates a standardized result object for table creation
     * @param table The created table (or null if failed)
     * @param success Whether the operation was successful
     * @param error Error information (if applicable)
     * @returns Standardized result object
     */
    protected createResult(
        table: TableBlockProxy | null, 
        success: boolean, 
        error?: any
    ): TableCreationResult {
        // Get table height for layout calculations
        let height = 0;
        if (table) {
            const boundingBox = table.getBoundingBox();
            height = boundingBox.h;
        }
        
        return {
            table,
            height,
            success,
            error
        };
    }
    
    /**
     * Logs a message with the table type prefix
     * @param message Message to log
     * @param level Log level (default: 'log')
     */
    protected log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
        const prefix = `[${this.getTableType()}]`;
        
        switch (level) {
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
}
