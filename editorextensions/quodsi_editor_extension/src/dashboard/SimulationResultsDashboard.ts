// SimulationResultsDashboard.ts

import { EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsReader } from '../data_sources/simulation_results/SimulationResultsReader';
import { DynamicSimulationResultsTableGenerator } from '../data_sources/simulation_results/DynamicSimulationResultsTableGenerator';
import { DashboardConfig, DashboardResult, DashboardTable } from './interfaces/DashboardTypes';
import { DashboardConfigManager } from './utils/DashboardConfigManager';
import { DashboardLayoutManager } from './layout/DashboardLayoutManager';
import { DashboardTableFactory } from './factory/DashboardTableFactory';

/**
 * A dashboard generator for simulation results
 * Creates a comprehensive view of all available simulation data
 */
export class SimulationResultsDashboard {
    private client: EditorClient;
    private resultsReader: SimulationResultsReader;
    private tableGenerator: DynamicSimulationResultsTableGenerator;
    private config: DashboardConfig;
    private layoutManager: DashboardLayoutManager;
    private tableFactory: DashboardTableFactory;

    /**
     * Creates a new dashboard generator
     * @param client Editor client
     * @param config Optional configuration overrides
     */
    constructor(client: EditorClient, config?: DashboardConfig) {
        this.client = client;
        this.config = DashboardConfigManager.mergeWithDefaults(config);
        this.resultsReader = new SimulationResultsReader(client);

        // Initialize the table generator with config
        this.tableGenerator = new DynamicSimulationResultsTableGenerator(
            this.resultsReader,
            this.config.tableConfig
        );

        // Initialize managers and factories
        this.layoutManager = new DashboardLayoutManager(this.config);
        this.tableFactory = new DashboardTableFactory(
            client,
            this.resultsReader,
            this.tableGenerator,
            this.config
        );
    }

    /**
     * Create a new dashboard page with tables for all available simulation data
     * @param pageName Name for the new page
     * @returns Promise with dashboard creation result
     */
    public async createDashboard(pageName: string): Promise<DashboardResult> {
        console.log(`[Dashboard] Creating new dashboard page: ${pageName}`);

        // Check if simulation results exist
        const hasResults = await this.resultsReader.hasSimulationResults();
        if (!hasResults) {
            throw new Error('No simulation results available');
        }

        // Create a new page for the dashboard
        const page = await this.layoutManager.createDashboardPage(this.client, pageName);

        // Initialize tracking variables
        let currentPosition = this.layoutManager.getInitialPosition();
        const tables: DashboardTable[] = [];
        const emptyDataTypes: string[] = [];
        const errors: DashboardResult['errors'] = [];

        // Get all enabled table handlers
        const handlers = this.tableFactory.getEnabledHandlers();
        console.log(`[Dashboard] Processing ${handlers.length} enabled table types`);

        // Process each handler
        for (const handler of handlers) {
            const tableType = handler.getTableType();
            
            try {
                // Check if this table can be created (has data)
                const canCreate = await handler.canCreateTable();
                
                if (!canCreate) {
                    console.log(`[Dashboard] No data available for ${tableType}`);
                    emptyDataTypes.push(tableType);
                    continue;
                }
                
                // Create the table
                const result = await handler.createTable(page, {
                    x: currentPosition.x,
                    y: currentPosition.y
                });
                
                if (result.success && result.table) {
                    // Add to successful tables
                    tables.push({
                        type: tableType,
                        table: result.table,
                        position: { x: currentPosition.x, y: currentPosition.y }
                    });
                    
                    // Update position for next table
                    currentPosition.y = this.layoutManager.calculateNextPosition(
                        currentPosition.y, 
                        result.height
                    );
                } else {
                    // Add to empty types if no table was created
                    emptyDataTypes.push(tableType);
                }
            } catch (error) {
                console.error(`[Dashboard] Error creating ${tableType} table:`, error);
                errors.push({ type: tableType, error });
            }
        }

        console.log(`[Dashboard] Created ${tables.length} tables on dashboard`);
        if (emptyDataTypes.length > 0) {
            console.log(`[Dashboard] No data available for: ${emptyDataTypes.join(', ')}`);
        }
        if (errors.length > 0) {
            console.warn(`[Dashboard] Encountered ${errors.length} errors during dashboard creation`);
        }

        // Make the viewport show the new page
        await this.layoutManager.setViewportToPage(this.client, page);

        return {
            page,
            tables,
            emptyDataTypes,
            errors
        };
    }
}
