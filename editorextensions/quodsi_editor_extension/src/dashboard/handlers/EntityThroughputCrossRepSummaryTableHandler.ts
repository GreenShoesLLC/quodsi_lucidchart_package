// handlers/EntityThroughputCrossRepSummaryTableHandler.ts

import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/results/TableResult';

/**
 * Handler for creating entity throughput cross replication summary tables
 */
export class EntityThroughputCrossRepSummaryTableHandler extends BaseTableHandler {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        return 'entityThroughputCrossRepSummary';
    }
    
    /**
     * Gets the default title for this table type
     * @returns Default title
     */
    getDefaultTitle(): string {
        return 'Entity Throughput Cross Replication Summary';
    }
    
    /**
     * Checks if this table can be created (has data)
     * @returns True if the table can be created
     */
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getEntityThroughputCrossRepSummaryData();
        return data && data.length > 0;
    }
    
    /**
     * Creates a table at the specified position
     * @param page Page to add the table to
     * @param position Position coordinates
     * @returns Table creation result
     */
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        this.log(`Creating entity throughput cross rep summary table at position (${position.x}, ${position.y})`);
        console.log('[DEBUG] EntityThroughputCrossRepSummaryTableHandler.createTable() called');
        
        try {
            // Check for data first
            const data = await this.resultsReader.getEntityThroughputCrossRepSummaryData();
            console.log('[DEBUG] EntityThroughputCrossRepSummaryTableHandler data check:', data.length, 'items');
            if (data.length > 0) {
                console.log('[DEBUG] EntityThroughputCrossRepSummaryTableHandler sample data:', 
                    'entity_name=', data[0].entity_name, 
                    'scenario_name=', data[0].scenario_name);
            }
            
            // Get table configuration
            const tableConfig = this.getTableConfig(position);
            console.log('[DEBUG] EntityThroughputCrossRepSummaryTableHandler config:', JSON.stringify(tableConfig));
            
            // Create the table
            const table = await this.tableGenerator.createEntityThroughputCrossRepSummaryTable(
                page, 
                this.client, 
                tableConfig
            );
            
            if (!table) {
                this.log('No data available for entity throughput cross rep summary table', 'warn');
                console.log('[DEBUG] EntityThroughputCrossRepSummaryTableHandler: table creation returned null');
                return this.createResult(null, false);
            }
            
            this.log('Entity throughput cross rep summary table created successfully');
            console.log('[DEBUG] EntityThroughputCrossRepSummaryTableHandler: table created successfully');
            return this.createResult(table, true);
        } catch (error) {
            this.log(`Error creating entity throughput cross rep summary table: ${error}`, 'error');
            console.log('[DEBUG] EntityThroughputCrossRepSummaryTableHandler error:', error);
            return this.createResult(null, false, error);
        }
    }
}