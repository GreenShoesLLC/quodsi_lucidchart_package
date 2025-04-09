// handlers/EntityStateCrossRepSummaryTableHandler.ts

import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/results/TableResult';

/**
 * Handler for creating entity state cross replication summary tables
 */
export class EntityStateCrossRepSummaryTableHandler extends BaseTableHandler {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        return 'entityStateCrossRepSummary';
    }
    
    /**
     * Gets the default title for this table type
     * @returns Default title
     */
    getDefaultTitle(): string {
        return 'Entity State Cross Replication Summary';
    }
    
    /**
     * Checks if this table can be created (has data)
     * @returns True if the table can be created
     */
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getEntityStateCrossRepSummaryData();
        return data && data.length > 0;
    }
    
    /**
     * Creates a table at the specified position
     * @param page Page to add the table to
     * @param position Position coordinates
     * @returns Table creation result
     */
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        this.log(`Creating entity state cross rep summary table at position (${position.x}, ${position.y})`);
        console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableHandler.createTable() called');
        
        try {
            // Check for data first
            const data = await this.resultsReader.getEntityStateCrossRepSummaryData();
            console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableHandler data check:', data.length, 'items');
            if (data.length > 0) {
                console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableHandler sample data:', 
                    'entity_name=', data[0].entity_name, 
                    'scenario_name=', data[0].scenario_name);
            }
            
            // Get table configuration
            const tableConfig = this.getTableConfig(position);
            console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableHandler config:', JSON.stringify(tableConfig));
            
            // Create the table
            const table = await this.tableGenerator.createEntityStateCrossRepSummaryTable(
                page, 
                this.client, 
                tableConfig
            );
            
            if (!table) {
                this.log('No data available for entity state cross rep summary table', 'warn');
                console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableHandler: table creation returned null');
                return this.createResult(null, false);
            }
            
            this.log('Entity state cross rep summary table created successfully');
            console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableHandler: table created successfully');
            return this.createResult(table, true);
        } catch (error) {
            this.log(`Error creating entity state cross rep summary table: ${error}`, 'error');
            console.log('[EntityStateCrossRepSummary] EntityStateCrossRepSummaryTableHandler error:', error);
            return this.createResult(null, false, error);
        }
    }
}