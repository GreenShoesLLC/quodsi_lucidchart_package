// handlers/ActivityUtilizationTableHandler.ts

import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/DashboardTypes';

/**
 * Handler for creating activity utilization tables
 */
export class ActivityUtilizationTableHandler extends BaseTableHandler {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        return 'activityUtilization';
    }
    
    /**
     * Gets the default title for this table type
     * @returns Default title
     */
    getDefaultTitle(): string {
        return 'Activity Utilization';
    }
    
    /**
     * Checks if this table can be created (has data)
     * @returns True if the table can be created
     */
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getActivityUtilizationData();
        return data && data.length > 0;
    }
    
    /**
     * Creates a table at the specified position
     * @param page Page to add the table to
     * @param position Position coordinates
     * @returns Table creation result
     */
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        this.log(`Creating table at position (${position.x}, ${position.y})`);
        
        try {
            // Get table configuration
            const tableConfig = this.getTableConfig(position);
            
            // Create the table
            const table = await this.tableGenerator.createActivityUtilizationTable(
                page, 
                this.client, 
                tableConfig
            );
            
            if (!table) {
                this.log('No data available for table', 'warn');
                return this.createResult(null, false);
            }
            
            this.log('Table created successfully');
            return this.createResult(table, true);
        } catch (error) {
            this.log(`Error creating table: ${error}`, 'error');
            return this.createResult(null, false, error);
        }
    }
}
