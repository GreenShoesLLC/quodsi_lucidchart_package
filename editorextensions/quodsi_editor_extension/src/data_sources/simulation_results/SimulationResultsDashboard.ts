// SimulationResultsDashboard.ts

import {
    PageProxy,
    TableBlockProxy,
    EditorClient,
    DocumentProxy,
    Viewport,
    PageDefinition
} from 'lucid-extension-sdk';

import { SimulationResultsReader } from './SimulationResultsReader';
import { DynamicSimulationResultsTableGenerator } from './DynamicSimulationResultsTableGenerator';


/**
 * Configuration for dashboard generation
 */
export interface DashboardConfig {
    /** Title to display at the top of the dashboard */
    title?: string;
    /** Space between tables (in pixels) */
    tableSpacing?: number;
    /** Initial X position for tables */
    initialX?: number;
    /** Initial Y position for tables */
    initialY?: number;
    /** Width for all tables */
    tableWidth?: number;
    /** Configuration to apply to all tables */
    tableConfig?: {
        formatNumbers?: boolean;
        percentDecimals?: number;
        numberDecimals?: number;
        styleHeader?: boolean;
        dynamicColumns?: boolean;
        maxColumns?: number;
    };
    /** Control which data types are included in the dashboard */
    includedDataTypes?: {
        activityUtilization?: boolean;
        activityRepSummary?: boolean;
        activityTiming?: boolean;
        entityThroughput?: boolean;
        resourceRepSummary?: boolean;
        entityState?: boolean;
    };
    /** Custom column configurations for specific table types */
    customColumnConfig?: {
        [dataType: string]: {
            columnOrder?: string[];
            excludeColumns?: string[];
        }
    };
}

/**
 * Default dashboard configuration
 */
const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
    title: 'Simulation Results Dashboard',
    tableSpacing: 50,
    initialX: 50,
    initialY: 50,
    tableWidth: 800,
    tableConfig: {
        formatNumbers: true,
        percentDecimals: 1,
        numberDecimals: 2,
        styleHeader: true,
        dynamicColumns: true,
        maxColumns: 6
    },
    includedDataTypes: {
        activityUtilization: true,
        activityRepSummary: true,
        activityTiming: true,
        entityThroughput: true,
        resourceRepSummary: true,
        entityState: true
    },
    customColumnConfig: {
        activityUtilization: {
            columnOrder: [
                'Name',
                'utilization_mean',
                'utilization_max',
                'capacity_mean',
                'capacity_max'
            ],
            excludeColumns: ['Id']
        },
        activityRepSummary: {
            columnOrder: [
                'activity_id',
                'rep',
                'utilization_percentage',
                'throughput_rate',
                'capacity'
            ]
        }
    }
};

/**
 * Result of a dashboard creation operation
 */
export interface DashboardResult {
    /** The created page */
    page: PageProxy;
    /** Tables that were successfully created */
    tables: {
        type: string;
        table: TableBlockProxy;
        position: { x: number; y: number };
    }[];
    /** Data types that had no data available */
    emptyDataTypes: string[];
    /** Any errors that occurred during creation */
    errors: { type: string; error: any }[];
}

/**
 * A dashboard generator for simulation results
 * Creates a comprehensive view of all available simulation data
 */
export class SimulationResultsDashboard {
    private client: EditorClient;
    private resultsReader: SimulationResultsReader;
    private tableGenerator: DynamicSimulationResultsTableGenerator;
    private config: DashboardConfig;

    constructor(client: EditorClient, config?: DashboardConfig) {
        this.client = client;
        this.config = { ...DEFAULT_DASHBOARD_CONFIG, ...config };
        this.resultsReader = new SimulationResultsReader(client);

        // Initialize the table generator with default config
        this.tableGenerator = new DynamicSimulationResultsTableGenerator(
            this.resultsReader,
            this.config.tableConfig
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
        const document = new DocumentProxy(this.client);
        const def: PageDefinition = {
                title: pageName,
            };
        const page = document.addPage(def);
        console.log(`[Dashboard] Created new page with ID: ${page.id}`);

        // Initialize tracking variables
        let currentY = this.config.initialY || 50;
        const tables: DashboardResult['tables'] = [];
        const emptyDataTypes: string[] = [];
        const errors: DashboardResult['errors'] = [];

        // Generate all requested tables
        if (this.config.includedDataTypes?.activityUtilization) {
            try {
                const result = await this.addTableToDashboard(
                    page,
                    'activityUtilization',
                    'Activity Utilization',
                    currentY
                );

                if (result) {
                    tables.push({
                        type: 'activityUtilization',
                        table: result.table,
                        position: { x: this.config.initialX || 50, y: currentY }
                    });
                    currentY = result.nextY;
                } else {
                    emptyDataTypes.push('activityUtilization');
                }
            } catch (error) {
                console.error('[Dashboard] Error creating activity utilization table:', error);
                errors.push({ type: 'activityUtilization', error });
            }
        }

        if (this.config.includedDataTypes?.activityRepSummary) {
            try {
                const result = await this.addTableToDashboard(
                    page,
                    'activityRepSummary',
                    'Activity Replication Summary',
                    currentY
                );

                if (result) {
                    tables.push({
                        type: 'activityRepSummary',
                        table: result.table,
                        position: { x: this.config.initialX || 50, y: currentY }
                    });
                    currentY = result.nextY;
                } else {
                    emptyDataTypes.push('activityRepSummary');
                }
            } catch (error) {
                console.error('[Dashboard] Error creating activity rep summary table:', error);
                errors.push({ type: 'activityRepSummary', error });
            }
        }

        if (this.config.includedDataTypes?.activityTiming) {
            try {
                const result = await this.addTableToDashboard(
                    page,
                    'activityTiming',
                    'Activity Timing',
                    currentY
                );

                if (result) {
                    tables.push({
                        type: 'activityTiming',
                        table: result.table,
                        position: { x: this.config.initialX || 50, y: currentY }
                    });
                    currentY = result.nextY;
                } else {
                    emptyDataTypes.push('activityTiming');
                }
            } catch (error) {
                console.error('[Dashboard] Error creating activity timing table:', error);
                errors.push({ type: 'activityTiming', error });
            }
        }

        if (this.config.includedDataTypes?.entityThroughput) {
            try {
                const result = await this.addTableToDashboard(
                    page,
                    'entityThroughput',
                    'Entity Throughput',
                    currentY
                );

                if (result) {
                    tables.push({
                        type: 'entityThroughput',
                        table: result.table,
                        position: { x: this.config.initialX || 50, y: currentY }
                    });
                    currentY = result.nextY;
                } else {
                    emptyDataTypes.push('entityThroughput');
                }
            } catch (error) {
                console.error('[Dashboard] Error creating entity throughput table:', error);
                errors.push({ type: 'entityThroughput', error });
            }
        }

        if (this.config.includedDataTypes?.resourceRepSummary) {
            try {
                const result = await this.addTableToDashboard(
                    page,
                    'resourceRepSummary',
                    'Resource Summary',
                    currentY
                );

                if (result) {
                    tables.push({
                        type: 'resourceRepSummary',
                        table: result.table,
                        position: { x: this.config.initialX || 50, y: currentY }
                    });
                    currentY = result.nextY;
                } else {
                    emptyDataTypes.push('resourceRepSummary');
                }
            } catch (error) {
                console.error('[Dashboard] Error creating resource summary table:', error);
                errors.push({ type: 'resourceRepSummary', error });
            }
        }

        if (this.config.includedDataTypes?.entityState) {
            try {
                const result = await this.addTableToDashboard(
                    page,
                    'entityState',
                    'Entity State Summary',
                    currentY
                );

                if (result) {
                    tables.push({
                        type: 'entityState',
                        table: result.table,
                        position: { x: this.config.initialX || 50, y: currentY }
                    });
                    currentY = result.nextY;
                } else {
                    emptyDataTypes.push('entityState');
                }
            } catch (error) {
                console.error('[Dashboard] Error creating entity state table:', error);
                errors.push({ type: 'entityState', error });
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
        const viewport = new Viewport(this.client);
        viewport.setCurrentPage(page);

        return {
            page,
            tables,
            emptyDataTypes,
            errors
        };
    }

    /**
     * Add a specific table type to the dashboard
     * @param page Page to add the table to
     * @param tableType Type of table to add
     * @param title Title for the table
     * @param yPosition Vertical position for the table
     * @returns The created table and the next Y position, or null if no data available
     */
    private async addTableToDashboard(
        page: PageProxy,
        tableType: string,
        title: string,
        yPosition: number
    ): Promise<{ table: TableBlockProxy; nextY: number } | null> {
        console.log(`[Dashboard] Adding ${tableType} table at y=${yPosition}`);

        let table: TableBlockProxy | null = null;

        // Apply custom column config if available for this table type
        const customConfig = this.config.customColumnConfig?.[tableType];

        const tableConfig = {
            position: { x: this.config.initialX || 50, y: yPosition },
            width: this.config.tableWidth || 800,
            title: title,
            ...customConfig
        };

        // Create table based on type
        switch (tableType) {
            case 'activityUtilization':
                table = await this.tableGenerator.createActivityUtilizationTable(page, this.client, tableConfig);
                break;

            case 'activityRepSummary':
                table = await this.tableGenerator.createActivityRepSummaryTable(page, this.client, tableConfig);
                break;

            // case 'activityTiming':
            //     table = await this.tableGenerator.createActivityTimingTable(page, this.client, tableConfig);
            //     break;

            // case 'entityThroughput':
            //     table = await this.tableGenerator.createEntityThroughputTable(page, this.client, tableConfig);
            //     break;

            // Add other table types as they are implemented in the generator

            default:
                console.warn(`[Dashboard] Unsupported table type: ${tableType}`);
                return null;
        }

        if (!table) {
            console.log(`[Dashboard] No data available for ${tableType}`);
            return null;
        }

        // Get the table height from the bounding box (available via ItemProxy)
        const boundingBox = table.getBoundingBox();
        const tableHeight = boundingBox.h;

        // Calculate the next Y position based on table height and spacing
        const nextY = yPosition + tableHeight + (this.config.tableSpacing || 50);

        return { table, nextY };
    }
}