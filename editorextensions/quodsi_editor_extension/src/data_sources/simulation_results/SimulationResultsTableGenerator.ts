// SimulationResultsTableGenerator.ts

import {
    PageProxy,
    TableBlockProxy,
    BlockDefinition,
    EditorClient
} from 'lucid-extension-sdk';


import {
    ActivityUtilization,
    ActivityRepSummary,
    ActivityTiming,
    EntityStateRepSummary,
    EntityThroughputRepSummary,
    ResourceRepSummary
} from './models';
import { SimulationResultsReader } from './SimulationResultsReader';

/**
 * Configuration for table generation
 */
export interface TableGenerationConfig {
    title?: string;
    position?: { x: number; y: number; };
    width?: number;
    height?: number;
    formatNumbers?: boolean;
    percentDecimals?: number;
    numberDecimals?: number;
    styleHeader?: boolean;
    headerBackgroundColor?: string;
    headerTextBold?: boolean;
}

/**
 * Default configuration for table generation
 */
const DEFAULT_CONFIG: TableGenerationConfig = {
    position: { x: 100, y: 100 },
    width: 600,
    height: 300,
    formatNumbers: true,
    percentDecimals: 1,
    numberDecimals: 2,
    styleHeader: true,
    headerBackgroundColor: '#f0f0f0',
    headerTextBold: true
};

/**
 * Column definition for table generation
 */
interface ColumnDefinition {
    header: string;
    field: string;
    formatter?: (value: any) => string;
    width?: number;
}

/**
 * Generator class for creating tables from simulation results
 */
export class SimulationResultsTableGenerator {
    private resultsReader: SimulationResultsReader;
    private config: TableGenerationConfig;

    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        this.resultsReader = resultsReader;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Creates a table for activity utilization data
     * @param page The page to add the table to
     * @param config Optional configuration overrides for this table
     */
    public async createActivityUtilizationTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        console.log('[TableGenerator] Creating activity utilization table...');

        // Merge config with instance config and defaults
        const tableConfig = { ...this.config, ...config };

        // Get activity utilization data
        const data = await this.resultsReader.getActivityUtilizationData();
        console.log('[TableGenerator] Activity utilization data:', data);

        if (!data || data.length === 0) {
            console.warn('[TableGenerator] No activity utilization data available');
            return null;
        }

        // Define columns for activity utilization
        const columns: ColumnDefinition[] = [
            { header: 'Activity', field: 'Name' },
            {
                header: 'Utilization',
                field: 'utilization_mean',
                formatter: (val) => this.formatPercent(val, tableConfig.percentDecimals)
            },
            {
                header: 'Max Utilization',
                field: 'utilization_max',
                formatter: (val) => this.formatPercent(val, tableConfig.percentDecimals)
            },
            {
                header: 'Capacity',
                field: 'capacity_mean',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            },
            {
                header: 'Queue Length',
                field: 'queue_length_mean',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            }
        ];

        const title = tableConfig.title || 'Activity Utilization';

        // Generate the table
        return this.generateTable(page, client, data, columns, title, tableConfig);
    }

    /**
     * Creates a table for activity replication summary data
     * @param page The page to add the table to
     * @param config Optional configuration overrides for this table
     */
    public async createActivityRepSummaryTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        console.log('[TableGenerator] Creating activity replication summary table...');

        // Merge config with instance config and defaults
        const tableConfig = { ...this.config, ...config };

        // Get activity replication summary data
        const data = await this.resultsReader.getActivityRepSummaryData();
        console.log('[TableGenerator] Activity replication summary data:', data);

        if (!data || data.length === 0) {
            console.warn('[TableGenerator] No activity replication summary data available');
            return null;
        }

        // Define columns for activity replication summary
        const columns: ColumnDefinition[] = [
            { header: 'Rep', field: 'rep' },
            { header: 'Activity', field: 'activity_id' },
            {
                header: 'Utilization',
                field: 'utilization_percentage',
                formatter: (val) => this.formatPercent(val / 100, tableConfig.percentDecimals)
            },
            {
                header: 'Throughput',
                field: 'throughput_rate',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            },
            {
                header: 'Capacity',
                field: 'capacity',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            }
        ];

        const title = tableConfig.title || 'Activity Replication Summary';

        // Generate the table
        return this.generateTable(page, client, data, columns, title, tableConfig);
    }

    /**
     * Creates a table for activity timing data
     * @param page The page to add the table to
     * @param config Optional configuration overrides for this table
     */
    public async createActivityTimingTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        console.log('[TableGenerator] Creating activity timing table...');

        // Merge config with instance config and defaults
        const tableConfig = { ...this.config, ...config };

        // Get activity timing data
        const data = await this.resultsReader.getActivityTimingData();
        console.log('[TableGenerator] Activity timing data:', data);

        if (!data || data.length === 0) {
            console.warn('[TableGenerator] No activity timing data available');
            return null;
        }

        // Define columns for activity timing
        const columns: ColumnDefinition[] = [
            { header: 'Activity', field: 'Name' },
            {
                header: 'Cycle Time',
                field: 'cycle_time_mean',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            },
            {
                header: 'Service Time',
                field: 'service_time_mean',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            },
            {
                header: 'Waiting Time',
                field: 'waiting_time_mean',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            },
            {
                header: 'Blocked Time',
                field: 'blocked_time_mean',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            }
        ];

        const title = tableConfig.title || 'Activity Timing';

        // Generate the table
        return this.generateTable(page, client, data, columns, title, tableConfig);
    }

    /**
     * Creates a table for entity throughput replication summary data
     * @param page The page to add the table to
     * @param config Optional configuration overrides for this table
     */
    public async createEntityThroughputTable(
        page: PageProxy,
        client: EditorClient,
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        console.log('[TableGenerator] Creating entity throughput table...');

        // Merge config with instance config and defaults
        const tableConfig = { ...this.config, ...config };

        // Get entity throughput data
        const data = await this.resultsReader.getEntityThroughputRepSummaryData();
        console.log('[TableGenerator] Entity throughput data:', data);

        if (!data || data.length === 0) {
            console.warn('[TableGenerator] No entity throughput data available');
            return null;
        }

        // Define columns for entity throughput
        const columns: ColumnDefinition[] = [
            { header: 'Rep', field: 'rep' },
            { header: 'Entity Type', field: 'entity_type' },
            {
                header: 'Count',
                field: 'count',
                formatter: (val) => this.formatNumber(val, 0)
            },
            {
                header: 'Completed',
                field: 'completed_count',
                formatter: (val) => this.formatNumber(val, 0)
            },
            {
                header: 'In Progress',
                field: 'in_progress_count',
                formatter: (val) => this.formatNumber(val, 0)
            },
            {
                header: 'Throughput',
                field: 'throughput_rate',
                formatter: (val) => this.formatNumber(val, tableConfig.numberDecimals)
            }
        ];

        const title = tableConfig.title || 'Entity Throughput Summary';

        // Generate the table
        return this.generateTable(page, client, data, columns, title, tableConfig);
    }

    /**
     * Generic method to generate a table from data and columns
     * @param page The page to add the table to
     * @param data Array of data objects
     * @param columns Column definitions
     * @param title Optional title for the table
     * @param config Table configuration
     * @returns The created table block or null if something went wrong
     */
    private async generateTable<T>(
        page: PageProxy,
        client: EditorClient,
        data: T[],
        columns: ColumnDefinition[],
        title: string,
        config: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        try {
            console.log(`[TableGenerator] Generating table: ${title}...`);

            // Create header row data
            const headerRow = columns.map(col => col.header);

            // Create data rows
            const dataRows = data.map(item =>
                columns.map(col => {
                    const value = item[col.field as keyof T];
                    return col.formatter && config.formatNumbers
                        ? col.formatter(value)
                        : String(value);
                })
            );

            // Combine header and data for a complete table
            const tableData = [headerRow, ...dataRows];

            // Load Table block class
            console.log('[TableGenerator] Loading DefaultTableBlock class...');
            await client.loadBlockClasses(['DefaultTableBlock']);

            // Create table block
            const blockDef: BlockDefinition = {
                className: "DefaultTableBlock",
                boundingBox: {
                    x: config.position?.x || 100,
                    y: config.position?.y || 100,
                    w: config.width || 600,
                    h: config.height || 300,
                },
            };

            console.log('[TableGenerator] Adding TableBlock to page...');
            const tableBlock = page.addBlock(blockDef) as TableBlockProxy;

            // Get row and column counts
            const rowCount = tableData.length;
            const columnCount = headerRow.length;

            // Get the initial cell to use as reference
            console.log('[TableGenerator] Getting initial rows...');
            const rows = tableBlock.getRows();
            let lastCell = rows[0].getCells()[0];

            // Add rows as needed
            console.log('[TableGenerator] Adding rows...');
            for (let i = 1; i < rowCount; i++) {
                const newRow = tableBlock.addRow(lastCell);
                lastCell = newRow.getCells()[0];
            }

            // Reset to use first row for column additions
            lastCell = rows[0].getCells()[0];

            // Add columns as needed
            console.log('[TableGenerator] Adding columns...');
            for (let i = 1; i < columnCount; i++) {
                const newColumn = tableBlock.addColumn(lastCell);
                lastCell = newColumn.getCells()[0];
            }

            // Populate table data
            console.log('[TableGenerator] Populating table data...');
            const updatedRows = tableBlock.getRows();

            tableData.forEach((rowData, rowIndex) => {
                const row = updatedRows[rowIndex];
                const cells = row.getCells();

                rowData.forEach((cellValue, colIndex) => {
                    const cell = cells[colIndex];
                    cell.setText(String(cellValue));

                    // Style header row
                    // if (rowIndex === 0 && config.styleHeader) {
                    //     if (config.headerBackgroundColor) {
                    //         cell.setBackgroundColor(config.headerBackgroundColor);
                    //     }
                    //     if (config.headerTextBold) {
                    //         cell.setBold(true);
                    //     }
                    // }
                });
            });

            console.log(`[TableGenerator] Table "${title}" created successfully`);
            return tableBlock;

        } catch (error) {
            console.error(`[TableGenerator] Error creating table "${title}":`, error);
            return null;
        }
    }

    /**
     * Format a number as a percentage
     * @param value The number value (0-1)
     * @param decimals Number of decimal places
     * @returns Formatted percentage string
     */
    private formatPercent(value: number, decimals: number = 1): string {
        // Ensure decimals is defined and valid
        const places = typeof decimals === 'number' ? decimals : 1;
        // Convert to percentage and format
        return (value * 100).toFixed(places) + '%';
    }

    /**
     * Format a number with the specified number of decimal places
     * @param value The number value
     * @param decimals Number of decimal places
     * @returns Formatted number string
     */
    private formatNumber(value: number, decimals: number = 2): string {
        // Ensure decimals is defined and valid
        const places = typeof decimals === 'number' ? decimals : 2;
        // Format with specified decimal places
        return value.toFixed(places);
    }
}