// handlers/ActivityTimingTableHandler.ts

import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/results/TableResult';


/**
 * Handler for creating activity timing tables
 */
export class ActivityTimingTableHandler extends BaseTableHandler {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        console.log('ActivityTimingTableHandler.getTableType() called - returning activityTiming');
        return 'activityTiming';
    }
    
    /**
     * Gets the default title for this table type
     * @returns Default title
     */
    getDefaultTitle(): string {
        return 'Activity Timing Analysis';
    }
    
    /**
     * Checks if this table can be created (has data)
     * @returns True if the table can be created
     */
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getActivityTimingData();
        return data && data.length > 0;
    }
    
    /**
     * Creates a table at the specified position
     * @param page Page to add the table to
     * @param position Position coordinates
     * @returns Table creation result
     */
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        this.log(`Creating activity timing table at position (${position.x}, ${position.y})`);
        
        try {
            // Get table configuration
            const tableConfig = this.getTableConfig(position);
            
            // Print the table config for debugging
            console.log('ActivityTimingTableHandler tableConfig:', tableConfig);
            
            // Force some useful settings
            tableConfig.maxColumns = 15; // Show more columns
            tableConfig.dynamicColumns = false; // Show all columns even if empty
            // tableConfig.excludeColumns = ['id', 'scenario_id']; // Only exclude these
            
            // Create the table
            const table = await this.tableGenerator.createActivityTimingTable(
                page, 
                this.client, 
                tableConfig
            );
            
            if (!table) {
                this.log('No data available for activity timing table', 'warn');
                return this.createResult(null, false);
            }
            
            this.log('Activity timing table created successfully');
            return this.createResult(table, true);
        } catch (error) {
            this.log(`Error creating activity timing table: ${error}`, 'error');
            return this.createResult(null, false, error);
        }
    }
}