// DynamicSimulationResultsTableGenerator.ts

import {
    PageProxy,
    TableBlockProxy,
    BlockDefinition,
    EditorClient,
    SchemaDefinition,
    ScalarFieldTypeEnum
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

// Import schemas from the schemas directory
import { ActivityUtilizationSchema } from './schemas/activityUtilizationSchema';
import { ActivityRepSummarySchema } from './schemas/activityRepSummarySchema';

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
    /** Only include columns that have data */
    dynamicColumns?: boolean;
    /** Maximum number of columns to display */
    maxColumns?: number;
    /** Column sorting behavior */
    columnOrder?: 'schema' | 'alphabetical' | 'numerical-first' | string[];
    /** Display types to prioritize */
    columnTypePriority?: string[];
    excludeColumns?: string[];
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
    headerTextBold: true,
    dynamicColumns: true,
    maxColumns: 8,
    columnOrder: 'schema',
    columnTypePriority: ['mean', 'max', 'min']
};

/**
 * Column definition for table generation
 */
interface ColumnDefinition {
    header: string;
    field: string;
    formatter?: (value: any) => string;
    width?: number;
    displayName?: string;
    sortOrder?: number;
    isIdentifier?: boolean;
    isPercentage?: boolean;
}

/**
 * Schema mapping for different data types
 */
interface SchemaMapping {
    [dataType: string]: {
        schema: SchemaDefinition;
        identifierFields: string[];
        percentageFields: string[];
        priorityFields: string[];
    }
}

/**
 * Dynamic generator class for creating tables from simulation results
 * that uses schema information to build tables
 */
export class DynamicSimulationResultsTableGenerator {
    private resultsReader: SimulationResultsReader;
    private config: TableGenerationConfig;
    private schemaMapping: SchemaMapping;

    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        this.resultsReader = resultsReader;
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Initialize schema mappings
        this.schemaMapping = this.initializeSchemaMapping();
    }

    /**
     * Initialize schema mappings with type information
     */
    private initializeSchemaMapping(): SchemaMapping {
        return {
            'activity_utilization': {
                schema: ActivityUtilizationSchema,
                identifierFields: ['Id', 'Name'],
                percentageFields: ['utilization_mean', 'utilization_max', 'utilization_std_dev'],
                priorityFields: ['Name', 'utilization_mean', 'utilization_max', 'capacity_mean', 'queue_length_mean']
            },
            'activity_rep_summary': {
                schema: ActivityRepSummarySchema,
                identifierFields: ['rep', 'activity_id'],
                percentageFields: ['utilization_percentage', 'operational_efficiency', 'cycle_time_efficiency'],
                priorityFields: ['rep', 'activity_id', 'utilization_percentage', 'throughput_rate', 'capacity']
            }
            // Add more schema mappings as needed
        };
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

        // Create schema-based columns
        const columns = this.createColumnsFromSchema(
            'activity_utilization',
            data[0],
            tableConfig
        );

        const title = tableConfig.title || 'Activity Utilization';

        // Generate the table with exactly the rows and columns needed
        return this.generateDynamicTable(page, client, data, columns, title, tableConfig);
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

        // Create schema-based columns
        const columns = this.createColumnsFromSchema(
            'activity_rep_summary',
            data[0],
            tableConfig
        );

        const title = tableConfig.title || 'Activity Replication Summary';

        // Generate the table with exactly the rows and columns needed
        return this.generateDynamicTable(page, client, data, columns, title, tableConfig);
    }

    /**
     * Create column definitions from a schema and sample data
     * @param schemaType The type of schema to use
     * @param sampleData Sample data object to check for available fields
     * @param config Table configuration
     * @returns Array of column definitions
     */
    private createColumnsFromSchema<T>(
        schemaType: string,
        sampleData: T,
        config: TableGenerationConfig
    ): ColumnDefinition[] {
        if (!this.schemaMapping[schemaType]) {
            console.warn(`[TableGenerator] No schema mapping found for type: ${schemaType}`);
            // Return basic columns based on the object keys
            return Object.keys(sampleData as any).map(key => ({
                header: key,
                field: key,
                formatter: (val) => this.formatValue(val, false, config.numberDecimals)
            }));
        }

        const schemaInfo = this.schemaMapping[schemaType];
        const schema = schemaInfo.schema;
        const identifierFields = schemaInfo.identifierFields || [];
        const percentageFields = schemaInfo.percentageFields || [];
        const priorityFields = schemaInfo.priorityFields || [];

        // Create all possible columns
        let allColumns: ColumnDefinition[] = [];

        // Add fields from schema
        if (schema && schema.fields) {
            allColumns = schema.fields.map(field => {
                const fieldName = field.name;
                const displayName = schema.fieldLabels?.[fieldName] || fieldName;
                const isPercentage = percentageFields.includes(fieldName);
                const isIdentifier = identifierFields.includes(fieldName);

                // Determine sort order for prioritization
                let sortOrder = priorityFields.indexOf(fieldName);
                if (sortOrder === -1) {
                    sortOrder = 1000; // Non-priority fields go to the end
                }

                // Check if field matches type priority (mean, max, etc.)
                if (config.columnTypePriority && !Array.isArray(config.columnOrder)) {
                    for (let i = 0; i < config.columnTypePriority.length; i++) {
                        const priorityType = config.columnTypePriority[i];
                        if (fieldName.includes(priorityType)) {
                            // Adjust sort order based on type priority
                            sortOrder = sortOrder - 100 + i;
                            break;
                        }
                    }
                }

                return {
                    header: displayName,
                    field: fieldName,
                    formatter: (val) => this.formatValue(val, isPercentage, config.numberDecimals),
                    displayName: displayName,
                    sortOrder: sortOrder,
                    isIdentifier: isIdentifier,
                    isPercentage: isPercentage
                };
            });
        }

        // Apply column exclusions if specified
        if (config.excludeColumns && config.excludeColumns.length > 0) {
            allColumns = allColumns.filter(col => !config.excludeColumns?.includes(col.field));
        }

        // Apply custom column order if provided as string array
        if (Array.isArray(config.columnOrder)) {
            const customOrder = config.columnOrder;

            // Sort columns based on the custom order
            allColumns.sort((a, b) => {
                const indexA = customOrder.indexOf(a.field);
                const indexB = customOrder.indexOf(b.field);

                // If both columns are in the custom order, sort by their position
                if (indexA >= 0 && indexB >= 0) {
                    return indexA - indexB;
                }

                // If only one column is in the custom order, it comes first
                if (indexA >= 0) return -1;
                if (indexB >= 0) return 1;

                // If neither column is in the custom order, maintain their relative positions
                return (a.sortOrder || 1000) - (b.sortOrder || 1000);
            });
        } else {
            // Use standard sorting methods
            this.sortColumns(allColumns, typeof config.columnOrder === 'string' ? config.columnOrder : 'schema');
        }

        // Filter columns based on dynamic data
        if (config.dynamicColumns) {
            allColumns = this.filterColumnsWithData(allColumns, [sampleData]);
        }

        // Limit columns if maxColumns is specified
        if (config.maxColumns && config.maxColumns > 0 && allColumns.length > config.maxColumns) {
            // Always include identifier columns unless they're explicitly excluded
            const identifiers = allColumns.filter(col => col.isIdentifier);
            const nonIdentifiers = allColumns.filter(col => !col.isIdentifier);

            // Sort non-identifiers by sortOrder
            nonIdentifiers.sort((a, b) => (a.sortOrder || 1000) - (b.sortOrder || 1000));

            // Take only enough non-identifiers to reach maxColumns
            const remainingSlots = config.maxColumns - identifiers.length;
            const selectedNonIdentifiers = remainingSlots > 0
                ? nonIdentifiers.slice(0, remainingSlots)
                : [];

            // Combine and resort by original sort order
            allColumns = [...identifiers, ...selectedNonIdentifiers];

            // Reapply custom ordering if provided
            if (Array.isArray(config.columnOrder)) {
                // Sort columns based on the custom order
                allColumns.sort((a, b) => {
                    const indexA = config.columnOrder?.indexOf(a.field) ?? -1;
                    const indexB = config.columnOrder?.indexOf(b.field) ?? -1;

                    // If both columns are in the custom order, sort by their position
                    if (indexA >= 0 && indexB >= 0) {
                        return indexA - indexB;
                    }

                    // If only one column is in the custom order, it comes first
                    if (indexA >= 0) return -1;
                    if (indexB >= 0) return 1;

                    // If neither column is in the custom order, maintain their relative positions
                    return (a.sortOrder || 1000) - (b.sortOrder || 1000);
                });
            } else {
                this.sortColumns(allColumns, typeof config.columnOrder === 'string' ? config.columnOrder : 'schema');
            }
        }

        console.log(`[TableGenerator] Created ${allColumns.length} columns for schema type: ${schemaType}`);
        return allColumns;
    }

    /**
     * Sort columns based on the specified order
     * @param columns Columns to sort
     * @param order Sort order strategy
     */
    private sortColumns(columns: ColumnDefinition[], order?: string): void {
        switch (order) {
            case 'alphabetical':
                columns.sort((a, b) => a.header.localeCompare(b.header));
                break;
            case 'numerical-first':
                columns.sort((a, b) => {
                    // First by identifier status
                    if (a.isIdentifier && !b.isIdentifier) return -1;
                    if (!a.isIdentifier && b.isIdentifier) return 1;

                    // Then by type (put numerical values first)
                    if (a.isPercentage !== b.isPercentage) {
                        return a.isPercentage ? -1 : 1;
                    }

                    // Finally by sort order
                    return (a.sortOrder || 1000) - (b.sortOrder || 1000);
                });
                break;
            case 'schema':
            default:
                // Sort by sort order (which is based on priority)
                columns.sort((a, b) => (a.sortOrder || 1000) - (b.sortOrder || 1000));
                break;
        }
    }

    /**
     * Filter columns to only include those that have data in at least one row
     * @param columns All possible column definitions
     * @param data Array of data objects to check for column values
     * @returns Filtered array of column definitions
     */
    private filterColumnsWithData<T>(columns: ColumnDefinition[], data: T[]): ColumnDefinition[] {
        if (!data || data.length === 0) {
            return columns;
        }

        return columns.filter(column => {
            // Always include identifier columns
            if (column.isIdentifier) {
                return true;
            }

            // Check if any row has data for this column
            return data.some(item => {
                const value = item[column.field as keyof T];
                // Consider the column valid if it has a non-null, non-undefined, non-empty value
                return value !== null && value !== undefined && value !== '' && value !== 0;
            });
        });
    }

    /**
     * Format a value based on its type
     * @param value The value to format
     * @param isPercentage Whether this is a percentage value
     * @param decimals Number of decimal places to use
     * @returns Formatted string value
     */
    private formatValue(value: any, isPercentage: boolean = false, decimals?: number): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        if (typeof value === 'number') {
            if (isPercentage) {
                // Handle percentage values (may already be in percentage or in decimal)
                const percentValue = value > 1 ? value : value * 100;
                return this.formatPercent(percentValue, decimals);
            } else {
                return this.formatNumber(value, decimals);
            }
        }

        return String(value);
    }

    // Corrected generateDynamicTable method for DynamicSimulationResultsTableGenerator.ts

    private async generateDynamicTable<T>(
        page: PageProxy,
        client: EditorClient,
        data: T[],
        columns: ColumnDefinition[],
        title: string,
        config: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        try {
            console.log(`[TableGenerator] Generating dynamic table: ${title}...`);
            console.log(`[TableGenerator] Using ${columns.length} columns for ${data.length} rows`);

            // Create header row data
            const headerRow = columns.map(col => col.header);

            // Create data rows
            const dataRows = data.map(item =>
                columns.map(col => {
                    const value = item[col.field as keyof T];
                    return col.formatter ? col.formatter(value) : String(value);
                })
            );

            // Calculate row and column counts
            const rowCount = dataRows.length + 1; // +1 for header row
            const columnCount = headerRow.length;

            // Load Table block class
            console.log('[TableGenerator] Loading DefaultTableBlock class...');
            await client.loadBlockClasses(['DefaultTableBlock']);

            // Calculate table height based on row count or use configured height
            const tableHeight = config.height || calculateDynamicTableHeight(rowCount);

            // Create table block
            const blockDef: BlockDefinition = {
                className: "DefaultTableBlock",
                boundingBox: {
                    x: config.position?.x || 100,
                    y: config.position?.y || 100,
                    w: config.width || 600,
                    h: tableHeight,
                }
            };

            console.log('[TableGenerator] Adding TableBlock to page...');
            const tableBlock = page.addBlock(blockDef) as TableBlockProxy;

            // Now we need to build the table to the exact dimensions we need
            console.log('[TableGenerator] Setting up table dimensions...');

            // Get the initial rows (usually just 1 row with 1 cell)
            const initialRows = tableBlock.getRows();

            // Add rows until we have enough rows
            console.log(`[TableGenerator] Ensuring table has ${rowCount} rows...`);
            let lastCell = initialRows[0].getCells()[0];

            // Add additional rows if needed
            while (tableBlock.getRowCount() < rowCount) {
                const newRow = tableBlock.addRow(lastCell);
                lastCell = newRow.getCells()[0];
            }

            // Add columns until we have enough columns
            console.log(`[TableGenerator] Ensuring table has ${columnCount} columns...`);
            // Start with the first cell of the first row
            lastCell = tableBlock.getRows()[0].getCells()[0];

            // Add additional columns if needed
            while (tableBlock.getColumnCount() < columnCount) {
                tableBlock.addColumn(lastCell);
                // No need to update lastCell here as we're always adding columns at the end
            }

            // Populate table data
            console.log('[TableGenerator] Populating table data...');
            const updatedRows = tableBlock.getRows();

            // Set header row
            const headerCells = updatedRows[0].getCells();
            headerRow.forEach((headerText, colIndex) => {
                if (colIndex < headerCells.length) {
                    const cell = headerCells[colIndex];
                    cell.setText(headerText);

                    // Style header
                    if (config.styleHeader) {
                        if (config.headerBackgroundColor) {
                            cell.setFill(config.headerBackgroundColor);
                        }
                        if (config.headerTextBold) {
                            cell.setTextStyle({ bold: true });
                        }
                    }
                }
            });

            // Set data rows
            dataRows.forEach((rowData, rowIndex) => {
                if (rowIndex + 1 < updatedRows.length) {
                    const row = updatedRows[rowIndex + 1]; // +1 to skip header
                    const cells = row.getCells();

                    rowData.forEach((cellValue, colIndex) => {
                        if (colIndex < cells.length) {
                            const cell = cells[colIndex];
                            cell.setText(String(cellValue));
                        }
                    });
                }
            });

            // Remove any extra rows if we happened to have more than we need
            while (tableBlock.getRowCount() > rowCount) {
                // Use deleteRow instead of removeRow (which doesn't exist)
                tableBlock.deleteRow(tableBlock.getRowCount() - 1);
            }

            console.log(`[TableGenerator] Table "${title}" created successfully with ${rowCount} rows and ${columnCount} columns`);
            return tableBlock;

        } catch (error) {
            console.error(`[TableGenerator] Error creating table "${title}":`, error);
            return null;
        }
    }

    /**
     * Format a number as a percentage
     * @param value The number value (0-100)
     * @param decimals Number of decimal places
     * @returns Formatted percentage string
     */
    private formatPercent(value: number, decimals: number = 1): string {
        // Ensure decimals is defined and valid
        const places = typeof decimals === 'number' ? decimals : 1;
        // Format with specified decimal places and add % symbol
        return value.toFixed(places) + '%';
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

/**
 * Calculate a reasonable table height based on the number of rows
 * @param rowCount Number of rows in the table
 * @returns Calculated height in pixels
 */
function calculateDynamicTableHeight(rowCount: number): number {
    // Estimate row height and header margin
    const estimatedRowHeight = 30;
    const headerMargin = 10;

    // Calculate based on row count with some padding
    return (rowCount * estimatedRowHeight) + headerMargin;
}