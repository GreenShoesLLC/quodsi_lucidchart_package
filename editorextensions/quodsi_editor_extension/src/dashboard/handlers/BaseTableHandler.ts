// handlers/BaseTableHandler.ts

import { PageProxy, TableBlockProxy, EditorClient, BlockProxy } from 'lucid-extension-sdk';
import { TableHandlerInterface } from '../interfaces/handlers/TableHandlerInterface';
import { TableCreationResult } from '../interfaces/results/TableResult';
import { DashboardConfig, getConfigValue } from '../interfaces/config/DashboardConfig';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { DynamicSimulationResultsTableGenerator } from '../DynamicSimulationResultsTableGenerator';
import { TableGenerationConfig } from '../interfaces/GeneratorTypes';

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
     * Creates a header for the table
     * @param page The page to create the header on
     * @param position The position to create the header
     * @returns The created header shape and its height
     */
    async createTableHeader(page: PageProxy, position: { x: number, y: number }): Promise<{
        header: BlockProxy;
        height: number;
    }> {
        this.log(`Creating header at position (${position.x}, ${position.y})`);
        
        // Get header text from config or use default
        const tableType = this.getTableType();
        const headerText = getConfigValue<string>(
            this.config,
            tableType,
            'header',
            this.getDefaultTitle()
        );
        
        // Get table width from config
        const tableWidth = this.config.layout?.tableWidth || 800;
        
        // Make sure the RectangleShape class is loaded
        await this.client.loadBlockClasses(['ProcessBlock']);
        
        // Create text shape for header using addBlock
        const headerShape = page.addBlock({
            className: 'ProcessBlock',
            boundingBox: {
                x: position.x,
                y: position.y,
                w: tableWidth,
                h: 30 // Default height for header
            }
        });
        
        // Set properties - we need to set these separately since they're not part of the block definition
        headerShape.properties.set('TextAlignment', 'center');
        headerShape.properties.set('FillColor', '#F0F0F0');
        headerShape.properties.set('BorderColor', '#FFFFFF'); // No visible border
        headerShape.properties.set('BorderWidth', 0);
        
        // Set the text content
        headerShape.textAreas.set('Text', headerText);
        
        // Set text styles
        // await headerShape.textStyles.set('Text', {
        //     fontFamily: 'Open Sans,Helvetica,Arial,sans-serif',
        //     fontSize: 14,
        //     bold: true,
        //     color: '#000000'
        // });
        
        // Get actual height
        const boundingBox = headerShape.getBoundingBox();
        const height = boundingBox.h;
        
        this.log(`Created header with text "${headerText}"`);
        
        return {
            header: headerShape,
            height 
        };
    }
    
    /**
     * Gets the table configuration for this table type
     * @param position Position for the table
     * @returns Table generation configuration
     */
    protected getTableConfig(position: { x: number, y: number }): TableGenerationConfig {
        const tableType = this.getTableType();
        
        // Get column configuration
        const columnOrder = getConfigValue<string[]>(
            this.config,
            tableType,
            'columns.order',
            []
        );
        
        const excludeColumns = getConfigValue<string[]>(
            this.config,
            tableType,
            'columns.exclude',
            []
        );
        
        // Get table formatting options
        const formatNumbers = getConfigValue<boolean>(
            this.config,
            tableType,
            'formatNumbers',
            true
        );
        
        const percentDecimals = getConfigValue<number>(
            this.config,
            tableType,
            'percentDecimals',
            1
        );
        
        const numberDecimals = getConfigValue<number>(
            this.config,
            tableType,
            'numberDecimals',
            2
        );
        
        const styleHeader = getConfigValue<boolean>(
            this.config,
            tableType,
            'styleHeader',
            true
        );
        
        const dynamicColumns = getConfigValue<boolean>(
            this.config,
            tableType,
            'dynamicColumns',
            true
        );
        
        const maxColumns = getConfigValue<number>(
            this.config,
            tableType,
            'maxColumns',
            6
        );
        
        // Set position and title
        const tableWidth = this.config.layout?.tableWidth || 800;
        
        return {
            position,
            title: this.getDefaultTitle(),
            columnOrder,
            excludeColumns,
            formatNumbers,
            percentDecimals,
            numberDecimals,
            styleHeader,
            dynamicColumns,
            maxColumns,
            width: tableWidth
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
