import { PageProxy, TableBlockProxy, BlockDefinition, EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { 
    SchemaMapping, 
    TableGenerationConfig, 
    ColumnDefinition, 
    DEFAULT_CONFIG 
} from '../interfaces/GeneratorTypes';

/**
 * Base class for all table generators that provides common functionality
 * and defines the interface for specialized generators
 */
export abstract class BaseTableGenerator {
    protected resultsReader: SimulationResultsReader;
    protected config: TableGenerationConfig;
    
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        this.resultsReader = resultsReader;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    
    /**
     * Returns the type identifier for this table generator
     */
    abstract getTableType(): string;

    /**
     * Returns the schema mapping for this table type
     */
    abstract getSchemaMapping(): SchemaMapping;

    /**
     * Retrieves the data for this table type
     */
    abstract getData(): Promise<any[]>;
    
    /**
     * Returns the default title for this table type
     */
    abstract getDefaultTitle(): string;
    
    /**
     * Template method that defines the table creation process
     * @param page The page to add the table to
     * @param client The editor client
     * @param config Optional configuration overrides for this table
     */
    public async createTable(
        page: PageProxy, 
        client: EditorClient, 
        config?: TableGenerationConfig
    ): Promise<TableBlockProxy | null> {
        console.log(`[TableGenerator] Creating ${this.getTableType()} table...`);
        
        // Merge config with instance config and defaults
        const tableConfig = { ...this.config, ...config };
        
        // Get data using specialized method
        const data = await this.getData();
        console.log(`[TableGenerator] ${this.getTableType()} data:`, data);
        
        if (!data || data.length === 0) {
            console.warn(`[TableGenerator] No ${this.getTableType()} data available`);
            return null;
        }
        
        // Create schema-based columns
        const columns = this.createColumnsFromSchema(data[0], tableConfig);
        
        const title = tableConfig.title || this.getDefaultTitle();
        
        // Generate the table with exactly the rows and columns needed
        return this.generateDynamicTable(page, client, data, columns, title, tableConfig);
    }
    
    /**
     * Create column definitions from schema mapping and sample data
     * @param sampleData Sample data object to check for available fields
     * @param config Table configuration
     */
    protected createColumnsFromSchema<T>(
        sampleData: T,
        config: TableGenerationConfig
    ): ColumnDefinition[] {
        const schemaInfo = this.getSchemaMapping();
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

        console.log(`[TableGenerator] Created ${allColumns.length} columns for schema type: ${this.getTableType()}`);
        return allColumns;
    }

    /**
     * Sort columns based on the specified order
     * @param columns Columns to sort
     * @param order Sort order strategy
     */
    protected sortColumns(columns: ColumnDefinition[], order?: string): void {
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
    protected filterColumnsWithData<T>(columns: ColumnDefinition[], data: T[]): ColumnDefinition[] {
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
                const value = (item as any)[column.field];
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
    protected formatValue(value: any, isPercentage: boolean = false, decimals?: number): string {
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

    /**
     * Format a number as a percentage
     * @param value The number value (0-100)
     * @param decimals Number of decimal places
     * @returns Formatted percentage string
     */
    protected formatPercent(value: number, decimals: number = 1): string {
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
    protected formatNumber(value: number, decimals: number = 2): string {
        // Ensure decimals is defined and valid
        const places = typeof decimals === 'number' ? decimals : 2;
        // Format with specified decimal places
        return value.toFixed(places);
    }

    /**
     * Generate a dynamic table with the specified data and columns
     * @param page The page to add the table to
     * @param client The editor client
     * @param data Array of data objects
     * @param columns Column definitions
     * @param title Table title
     * @param config Table configuration
     * @returns Created table block or null if creation failed
     */
    protected async generateDynamicTable<T>(
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
                    const value = (item as any)[col.field];
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
            const tableHeight = config.height || this.calculateDynamicTableHeight(rowCount);

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
     * Calculate a reasonable table height based on the number of rows
     * @param rowCount Number of rows in the table
     * @returns Calculated height in pixels
     */
    protected calculateDynamicTableHeight(rowCount: number): number {
        // Estimate row height and header margin
        const estimatedRowHeight = 30;
        const headerMargin = 10;

        // Calculate based on row count with some padding
        return (rowCount * estimatedRowHeight) + headerMargin;
    }
}