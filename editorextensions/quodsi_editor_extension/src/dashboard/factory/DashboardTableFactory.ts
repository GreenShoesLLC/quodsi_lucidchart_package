// factory/DashboardTableFactory.ts

import { EditorClient } from 'lucid-extension-sdk';
import { DashboardConfig } from '../interfaces/DashboardConfigInterface';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { DynamicSimulationResultsTableGenerator } from '../DynamicSimulationResultsTableGenerator';
import { TableHandlerInterface } from '../interfaces/handlers/TableHandlerInterface';
import { DashboardConfigManager } from '../config/DashboardConfigManager';
import { ActivityUtilizationTableHandler } from '../handlers/ActivityUtilizationTableHandler';
import { ActivityRepSummaryTableHandler } from '../handlers/ActivityRepSummaryTableHandler';
import { ActivityTimingTableHandler } from '../handlers/ActivityTimingTableHandler';
import { EntityThroughputTableHandler } from '../handlers/EntityThroughputTableHandler';
import { EntityStateTableHandler } from '../handlers/EntityStateTableHandler';
import { ResourceUtilizationTableHandler } from '../handlers/ResourceUtilizationTableHandler';
import { ResourceRepSummaryTableHandler } from '../handlers/ResourceRepSummaryTableHandler';

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
        this.registerHandler(new EntityStateTableHandler(
            this.client,
            this.resultsReader,
            this.tableGenerator,
            this.config
        ));
        
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

        this.registerHandler(new ActivityTimingTableHandler(
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

        this.registerHandler(new ResourceUtilizationTableHandler(
            this.client,
            this.resultsReader,
            this.tableGenerator,
            this.config
        ));

        this.registerHandler(new ResourceRepSummaryTableHandler(
            this.client,
            this.resultsReader,
            this.tableGenerator,
            this.config
        ));
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

        // Sort handlers based on tableOrder if provided
        if (this.config.tableOrder && this.config.tableOrder.length > 0) {
            enabled.sort((a, b) => {
                const indexA = this.config.tableOrder?.indexOf(a.getTableType()) ?? -1;
                const indexB = this.config.tableOrder?.indexOf(b.getTableType()) ?? -1;

                // If both have a position in the order array
                if (indexA >= 0 && indexB >= 0) {
                    return indexA - indexB;
                }

                // If only one has a position, it comes first
                if (indexA >= 0) return -1;
                if (indexB >= 0) return 1;

                // If neither has a position, maintain original order
                return 0;
            });
        }

        return enabled;
    }

    /**
     * Checks if a table type is enabled in the configuration
     * @param tableType Type of table to check
     * @returns True if the table type is enabled
     */
    private isTableTypeEnabled(tableType: string): boolean {
        return DashboardConfigManager.isTableTypeEnabled(this.config, tableType);
    }
}