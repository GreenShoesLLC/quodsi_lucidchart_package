// factory/DashboardTableFactory.ts

import { EditorClient } from 'lucid-extension-sdk';
import { DashboardConfig } from '../interfaces/DashboardTypes';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { DynamicSimulationResultsTableGenerator } from '../../data_sources/simulation_results/DynamicSimulationResultsTableGenerator';
import { TableHandlerInterface } from '../interfaces/DashboardTypes';
import { BaseTableHandler } from '../handlers/BaseTableHandler';
import { ActivityUtilizationTableHandler } from '../handlers/ActivityUtilizationTableHandler';
import { ActivityRepSummaryTableHandler } from '../handlers/ActivityRepSummaryTableHandler';
import { EntityThroughputTableHandler } from '../handlers/EntityThroughputTableHandler';

/**
 * Factory for creating table handlers
 */
export class DashboardTableFactory {
    private client: EditorClient;
    private resultsReader: SimulationResultsReader;
    private tableGenerator: DynamicSimulationResultsTableGenerator;
    private config: DashboardConfig;
    private handlers: Map<string, TableHandlerInterface>;

    /**
     * Creates a new table factory
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
        this.handlers = new Map();
        
        // Initialize handlers
        this.initializeHandlers();
    }

    /**
     * Initializes all available table handlers
     */
    private initializeHandlers(): void {
        // Register built-in handlers
        this.registerHandler(new ActivityUtilizationTableHandler(
            this.client,
            this.resultsReader,
            this.tableGenerator,
            this.config
        ));

        this.registerHandler(new ActivityRepSummaryTableHandler(
            this.client,
            this.resultsReader,
            this.tableGenerator,
            this.config
        ));
        this.registerHandler(new EntityThroughputTableHandler(
            this.client,
            this.resultsReader,
            this.tableGenerator,
            this.config
        ));
        
        // TODO: Add more handlers as they are implemented
        // this.registerHandler(new ActivityTimingTableHandler(...));
        // this.registerHandler(new ResourceRepSummaryTableHandler(...));
        // this.registerHandler(new EntityStateTableHandler(...));
    }

    /**
     * Registers a table handler
     * @param handler Handler to register
     */
    registerHandler(handler: TableHandlerInterface): void {
        const type = handler.getTableType();
        this.handlers.set(type, handler);
        console.log(`[TableFactory] Registered handler for ${type}`);
    }

    /**
     * Gets a handler for the specified table type
     * @param tableType Type of table to get handler for
     * @returns Handler for the specified type, or null if not found
     */
    getHandler(tableType: string): TableHandlerInterface | null {
        return this.handlers.get(tableType) || null;
    }

    /**
     * Gets all registered handlers
     * @returns Array of all handlers
     */
    getAllHandlers(): TableHandlerInterface[] {
        return Array.from(this.handlers.values());
    }

    /**
     * Gets handlers for all enabled table types
     * @returns Array of enabled handlers
     */
    getEnabledHandlers(): TableHandlerInterface[] {
        const enabled: TableHandlerInterface[] = [];
        
        // Only include handlers for enabled table types
        for (const handler of this.handlers.values()) {
            const type = handler.getTableType();
            if (this.isTableTypeEnabled(type)) {
                enabled.push(handler);
            }
        }
        
        return enabled;
    }

    /**
     * Checks if a table type is enabled in the configuration
     * @param tableType Type of table to check
     * @returns True if the table type is enabled
     */
    private isTableTypeEnabled(tableType: string): boolean {
        if (!this.config.includedDataTypes) {
            return false;
        }

        return !!this.config.includedDataTypes[tableType as keyof typeof this.config.includedDataTypes];
    }
}
